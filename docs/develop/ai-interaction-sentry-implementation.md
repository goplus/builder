# AI Interaction Sentry Implementation

本文是 [AI Interaction Sentry](./ai-interaction-sentry.md) 的实现索引，按初始化、Trace Hook、HTTP 请求和资源清理说明当前链路。

## 代码分布

以下 Builder 文件路径以仓库根目录为基准。

| 文件                                                      | 职责                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `tools/ai/ai.go`                                          | 执行 Think 和历史归档，在一次交互开始时保存 Transport           |
| `tools/ai/transport_context.go`                           | 通过 context 保存和读取 extra headers 的副本                    |
| `tools/ai/wasmtrans/wasmtrans.go`                         | 构造 HTTP 请求、调用原生 fetch、读取和解析响应                  |
| `tools/ai/wasmtrans/headers.go`                           | 合并 extra headers，保护凭据和 HTTP 控制字段                    |
| `tools/ai/wasmtrans/promise.go`                           | 等待 JS Promise，返回结果、拒绝原因或 context 错误              |
| `tools/ai/httperr.go`                                     | 将 API 的 quota、429 和其他 HTTP 失败转换为 Go 错误             |
| `tools/ispx/ai.go`                                        | 接收 AI 配置，组装 `wasmtrans` 和 `traceTransport`              |
| `tools/ispx/trace_transport.go`                           | 在 Interact / Archive 调用前后执行监控，传递 headers 和结束状态 |
| `tools/ispx/trace_hook_wasm.go`                           | 保存并直接调用页面 Hook，将 JavaScript 异常隔离在监控层         |
| `spx-gui/src/ispx/sentry-trace-hook.ts`                   | 将 Hook 调用转换为独立 Sentry span，并管理活跃 span             |
| `spx-gui/src/components/project/runner/ProjectRunner.vue` | 准备游戏和 AI 配置，安装 Hook，管理运行期间的资源清理           |
| `spx-gui/src/setup/sentry.ts`                             | 初始化 Sentry，配置 AI 请求采样和自动 fetch tracing 过滤        |

配套 Builder backend 的文件路径以其仓库根目录为基准：

| 文件                                       | 职责                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `cmd/xbuilder-backend/middleware.go`       | 按配置匹配 body 捕获路由，创建并结束 HTTP transaction                            |
| `internal/tracer/transaction.go`           | 续接 trace，保存 metadata、HTTP 状态和有大小限制的 body                          |
| `internal/tracer/response_writer.go`       | 代理响应写入，记录状态、首次写入时间和响应 body 前缀                             |
| `internal/tracer/metadata.go`              | 提供 context 内并发安全的 tag/extra 记录器                                       |
| `internal/tracer/httpclient/client.go`     | 记录模型 HTTP 请求的 RoundTrip、响应头和传输错误                                 |
| `internal/aiinteraction/aiinteraction.go`  | 读取模型流，累积响应，将 completion ID 放入内部 metadata                         |
| `internal/aiinteraction/types.go`          | 定义内部 metadata 和携带错误 metadata 的 `ErrorWithMetadata`                     |
| `internal/aiinteraction/tracer.go`         | 包装 Interact / Archive，将响应及错误中的 metadata 写入请求 context              |
| `internal/controller/controller.go`        | 安装 AI interaction 包装                                                         |
| `cmd/xbuilder-backend/util.go` / `slog.go` | 将内部服务器错误原文写入 `error.message`，并给请求错误日志附加 `sentry_trace_id` |
| `internal/config/config.go` / `loader.go`  | 定义并读取 Sentry 采样和 body 捕获路由配置                                       |

## 初始化与接线

1. Go 的 `init()` 注册 `xbuilder_set_trace_hook` JS 入口。
2. `ProjectRunner.prepareAIInteraction()` 为使用 AI 的项目准备描述、endpoint 和 token provider，再创建页面侧 Sentry Trace Hook。
3. `installTraceHook()` 把 `controller.hook` 注入 iframe；如果注入失败，只关闭该 controller，不阻止游戏启动。
4. Go 的 `setTraceHook()` 保存新的回调，再调用 `resetAIDefaultTransport()`。
5. endpoint 和 token provider 齐备后，`resetAIDefaultTransport()` 创建 `wasmtrans`，用当前 Hook 包装成 `traceTransport`，并通过 `ai.SetDefaultTransport()` 安装。

```text
ProjectRunner
  -> createSentryTraceHook()
  -> iframe.xbuilder_set_trace_hook(controller.hook)
  -> Go setTraceHook()
  -> resetAIDefaultTransport()
  -> traceTransport(wasmtrans)
```

## Trace Hook 契约

页面提供的 Hook 是一个同步回调：

```ts
type TraceHook = (input: { name: string; operation: string }) => {
  propagationHeaders: Record<string, string>;
  finish(status: "ok" | "error" | "cancelled"): void;
} | null;
```

调用 Hook 时，页面用 `startNewTrace()` 和 `startInactiveSpan()` 创建独立 root，并通过 `getTraceData()` 得到传播请求头。返回的 `finish` 闭包直接捕获本次 span，因此调用方不需要保存 operation ID，也不需要建立双向消息协议。

Go 通过 `syscall/js` 直接调用 Hook，读取字符串类型的传播头，并包装返回的 `finish`。Go 侧的 `sync.Once` 和页面侧的 `finished` 标志共同保证结束操作最多执行一次。

Hook 是可选能力。未安装、已关闭、返回 `null`，或者 Sentry 创建/传播/结束过程抛出异常时，监控层失败开放，AI 请求继续走底层 Transport。

## 一次 HTTP 请求

1. AI 调用保存的 Transport，进入 `traceTransport.Interact()` 或 `Archive()`。
2. 包装层用请求名和 `http.client` 调用 Hook。
3. 页面创建独立 Sentry span，返回 `Sentry-Trace`、`Baggage` 和该 span 对应的 `finish`。
4. 包装层通过 `ai.WithExtraHeaders()` 将 headers 写入原始请求的派生 context；Hook 不可用时跳过这一步。
5. `wasmtrans` 合并 headers，用 `AbortController` 关联请求 context，调用浏览器原生 `fetch`，并解析完整 HTTP 响应。
6. 后端 middleware 续接 trace，业务调用模型，`TracerInteraction` 从返回响应或错误提取 metadata。HTTP handler 返回后，transaction 保存 metadata、HTTP 状态和按配置捕获的 body。
7. Transport 返回后，包装层根据 context 和 error 判定 `ok`、`error` 或 `cancelled`，通过 defer 调用 `finish(status)`。

## 生命周期与并发

- 一个 `traceTransport` 保存创建时的 Hook；一次 Think 及其安排的历史归档沿用保存的 Transport。
- 每次 Hook 调用都创建独立 span，并返回只绑定该 span 的 `finish`，因此并发请求之间不共享 ID 或 pending map。
- Runner 在 stop、rerun、开始新运行、unmount、iframe reload、game error 和 exit 路径关闭当前 controller，并把 iframe 内 Hook 清空。
- controller 关闭时，将仍活跃的 span 结束为 `cancelled`；关闭后的 Hook 对迟到调用返回 `null`。
- 清理 Hook 只结束观测资源。实际网络取消仍由请求 context 和 `wasmtrans` 的 `AbortController` 负责。
- Sentry 状态设置和 span 结束分别容错，状态设置失败时仍会尝试结束 span。

## 后端数据配置

`SENTRY_CAPTURE_BODY_ROUTES` 使用逗号分隔的 `METHOD /path`，例如：

```dotenv
SENTRY_CAPTURE_BODY_ROUTES="POST /ai-interaction/turns,POST /ai-interaction/archives"
```

路由命中时，request 和 response body 分别保存最多 15 KiB，截断标记保存各自完整字节数。`request_id` 从响应或错误的内部 metadata 写入 transaction；`http.first_byte_ms` 从 transaction 开始计时，到首次写响应体时结束。

`ErrorWithMetadata` 保存原始 error 和 metadata 副本，`Error()` 保留错误文本，`Unwrap()` 保留 `errors.Is/As` 的错误链判断。`Interact` 的模型调用和命令参数解析错误出口、`Archive` 的模型调用错误出口通过 `wrapErrorWithMetadata()` 附带已取得的信息；`TracerInteraction` 使用 `errors.As` 提取后沿用 context metadata 记录器。

`replyWithInnerError()` 在映射为内部服务器错误的分支调用 `tracer.SetExtra(ctx, "error.message", err.Error())`。transaction 结束时将完整错误文本写入 span data；该记录独立于 body 捕获配置。HTTP 响应沿用统一的 `code/msg` 格式。

## 验证

在对应目录执行以下静态和单元检查：

```sh
# builder/tools/ai
go test ./...

# builder/tools/ispx
GOOS=js GOARCH=wasm go build ./...
GOOS=js GOARCH=wasm go test .

# builder/spx-gui
pnpm type-check
pnpm exec vitest run src/ispx/sentry-trace-hook.test.ts src/utils/tracing.test.ts
pnpm exec eslint src/ispx/sentry-trace-hook.ts src/ispx/sentry-trace-hook.test.ts src/components/project/runner/ProjectRunner.vue
./build-wasm.sh
pnpm build
```

浏览器联调使用已配置 Sentry 且会执行 Sentry 初始化的运行环境，检查：

1. Interact 和 Archive 请求各自生成对应名称的独立 browser `http.client` root。
2. HTTP 请求带有页面返回的 `Sentry-Trace` / `Baggage`，后端 transaction 使用相同 trace ID。
3. 成功和失败请求分别结束为对应状态，请求 context 结束时走取消处理。
4. 配置 body 捕获后，后端 transaction 保存 API request/response body；超限 body 带有完整字节数标记。
5. 模型调用取得 completion ID 后，成功返回或随后流读取、响应解析失败时，后端 transaction 均包含 `request_id`。
6. 停止、重新运行、卸载、iframe reload、游戏错误和退出后，未完成 span 被清理；并发请求各自结束。
7. 页面 Hook 缺失、安装失败或 Sentry 调用失败时，AI 请求继续通过底层 Transport 执行。
