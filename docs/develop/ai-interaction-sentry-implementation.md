# AI Interaction Sentry Implementation

本文是 [AI Interaction Sentry](./ai-interaction-sentry.md) 的实现索引，按初始化、消息通信、HTTP 请求和资源清理说明当前链路。

## 代码分布

以下 Builder 文件路径以仓库根目录为基准。

| 文件 | 职责 |
| --- | --- |
| `tools/ai/ai.go` | 执行 Think 和历史归档，在一次交互开始时保存 Transport |
| `tools/ai/transport_context.go` | 通过 context 保存和读取 extra headers 的副本 |
| `tools/ai/wasmtrans/wasmtrans.go` | 构造 HTTP 请求、调用 fetch、读取和解析响应 |
| `tools/ai/wasmtrans/headers.go` | 合并 extra headers，保护凭据和 HTTP 控制字段 |
| `tools/ai/wasmtrans/promise.go` | 等待 JS Promise，返回结果、拒绝原因或 context 错误 |
| `tools/ai/httperr.go` | 将 API 的 quota、429 和其他 HTTP 失败转换为 Go 错误 |
| `tools/ispx/ai.go` | 接收 AI 配置，组装 `wasmtrans` 和 `telemetryTransport` |
| `tools/ispx/telemetry_transport.go` | 在 Interact / Archive 调用前后执行监控，传递 headers 和结束状态 |
| `tools/ispx/rpc_wasm.go` | 保存 JS 回调，编码发送消息，解码页面回复，切换当前 RPC session |
| `tools/ispx/internal/rpc/client.go` | 实现 `Call`、`Notify`、`HandleMessage`、`Close` 和 pending 管理 |
| `tools/ispx/internal/telemetry/protocol.go` | 定义 operation 方法名及请求、回复、结束通知结构 |
| `tools/ispx/internal/telemetry/client.go` | 请求创建操作，限制等待时间，保存页面返回的编号和 headers |
| `tools/ispx/internal/telemetry/operation.go` | 提供 headers 副本，保证 Finish 只执行一次 |
| `spx-gui/src/ispx/rpc.ts` | 接收 RPC 消息、异步分发、回复结果并管理取消 |
| `spx-gui/src/ispx/sentry-telemetry-adapter.ts` | 将 operation 消息转换为 Sentry 调用，管理活跃 span |
| `spx-gui/src/components/project/runner/ProjectRunner.vue` | 准备游戏和 AI 配置，注册双向回调，管理运行期间的消息连接 |
| `spx-gui/src/setup/sentry.ts` | 初始化 Sentry，配置 AI 请求采样和自动 fetch tracing 过滤 |

配套 Builder backend 的文件路径以其仓库根目录为基准：

| 文件 | 职责 |
| --- | --- |
| `cmd/xbuilder-backend/middleware.go` | 按配置匹配 body 捕获路由，创建并结束 HTTP transaction |
| `internal/tracer/transaction.go` | 续接 trace，保存 metadata、HTTP 状态和有大小限制的 body |
| `internal/tracer/response_writer.go` | 代理响应写入，记录状态、首次写入时间和响应 body 前缀 |
| `internal/tracer/metadata.go` | 提供 context 内并发安全的 tag/extra 记录器 |
| `internal/tracer/httpclient/client.go` | 记录模型 HTTP 请求的 RoundTrip、响应头和传输错误 |
| `internal/aiinteraction/aiinteraction.go` | 读取模型流，累积响应，将 completion ID 放入内部 metadata |
| `internal/aiinteraction/types.go` | 定义内部 metadata 和携带错误 metadata 的 `ErrorWithMetadata` |
| `internal/aiinteraction/tracer.go` | 包装 Interact / Archive，将响应及错误中的 metadata 写入请求 context |
| `internal/controller/controller.go` | 安装 AI interaction 包装 |
| `cmd/xbuilder-backend/util.go` / `slog.go` | 将内部服务器错误原文写入 `error.message`，并给请求错误日志附加 `sentry_trace_id` |
| `internal/config/config.go` / `loader.go` | 定义并读取 Sentry 采样和 body 捕获路由配置 |

## 初始化与接线

1. Go 的 `init()` 注册 `xbuilder_set_message_replier` 和 `xbuilder_handle_rpc_message` 两个 JS 入口。
2. `ProjectRunner.prepareAIInteraction()` 为使用 AI 的项目准备描述，等待引擎初始化，注入 endpoint 和 token provider，再安装 RPC session。
3. `installISPXRPCSession()` 创建 `RPCSession(createSentryTelemetryAdapter(), sendMessage)`，将页面回复函数接到 `xbuilder_handle_rpc_message`，将 Go 发出的消息接到 `session.handleMessage`。
4. Go 的 `setMessageReplier()` 用页面回调构造 `messageReplier`、`rpc.Client` 和 `telemetry.Client`，替换并关闭旧 RPC client。
5. `resetAIDefaultTransport()` 在 endpoint 和 token provider 齐备后创建 `wasmtrans`，用当前 telemetry client 包装，并通过 `ai.SetDefaultTransport()` 安装。

```text
Go -> messageReplier.SendMessage
   -> JS callback
   -> RPCSession.handleMessage
   -> Sentry telemetry adapter

页面 RPC reply -> xbuilder_handle_rpc_message
              -> receiveRPCMessage
              -> rpc.Client.HandleMessage
              -> 唤醒对应 Call
```

## JSON-RPC 协议

### 创建操作

`telemetry/operation.start` 是带 `id` 的 Call。示例中的时间戳和编号用于展示数据形状：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "telemetry/operation.start",
  "params": {
    "name": "POST /ai-interaction/turns",
    "operation": "http.client",
    "startTimeUnixMilli": 1788652800000,
    "propagation": "http"
  }
}
```

页面创建独立 trace 和 inactive span，将 span 保存到 `operations` Map；随后取得传播请求头，返回以下结构：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "operationId": "0123456789abcdef",
    "propagationHeaders": {
      "Sentry-Trace": "0123456789abcdef0123456789abcdef-0123456789abcdef-1",
      "Baggage": "sentry-trace_id=0123456789abcdef0123456789abcdef"
    }
  }
}
```

RPC `id` 用于匹配请求与回复；`operationId` 用于后续找到对应的监控记录。页面当前使用 span ID 作为 operation ID。

### 结束操作

`telemetry/operation.finish` 是单向 Notification：

```json
{
  "jsonrpc": "2.0",
  "method": "telemetry/operation.finish",
  "params": {
    "operationId": "0123456789abcdef",
    "endTimeUnixMilli": 1788652801200,
    "status": "ok"
  }
}
```

开始和结束消息都支持可选 `attributes`。结束状态为 `ok`、`error` 或 `cancelled`，页面将其映射到 Sentry span 状态并结束记录。

### 取消请求

Go 的 RPC Call 在 context 结束时移除 pending 项，并发送 `$/cancelRequest` 通知，参数为对应的 RPC `id`。页面通过 `AbortController` 通知仍在处理该请求的 handler。Session 关闭时，双方分别完成本地等待和资源清理。

## 一次 HTTP 请求

1. AI 调用保存的 Transport，进入 `telemetryTransport.Interact()` 或 `Archive()`。
2. `telemetry.Client.Start()` 用原始请求 context 派生最多 500ms 的等待 context，并发送 start Call。
3. Go RPC 先登记 pending，再通过 `MessageSender.SendMessage()` 发送消息。WASM 实现编码 JSON、调用页面函数，并将 JS panic 转换为 Go error。
4. 页面 `RPCSession` 使用 microtask 分发到 adapter，再把结果沿 JS 入口返回给 Go。Go 解码回复，按 RPC ID 唤醒等待中的 Call。
5. 开始成功后，包装层将 headers 写入原始请求的派生 context，再调用底层 Transport；开始失败时直接调用底层 Transport。
6. `wasmtrans` 合并 headers，用 `AbortController` 关联请求 context，调用 fetch，并解析完整 HTTP 响应。
7. 后端 middleware 续接 trace，业务调用模型，`TracerInteraction` 从返回响应或错误提取 metadata。HTTP handler 返回后，transaction 保存 metadata、HTTP 状态和按配置捕获的 body。
8. Transport 返回后，包装层检查 context 和返回错误，调用 `Operation.Finish()`。页面根据操作编号更新状态、结束 span 并删除 Map 项。

## 生命周期与并发

- Go RPC 使用进程内递增请求 ID，pending Map 由锁保护；回复通过缓冲 channel 交给等待者。
- `Operation.Finish()` 使用 `sync.Once`，传播 headers 在保存和读取时复制。
- 一个 Transport 包装持有创建时的 telemetry client；一次 Think 及其安排的历史归档沿用保存的 Transport。
- Runner 的 stop、rerun、unmount、iframe reload、game error 和 exit 路径关闭 session。页面结束剩余操作，Go RPC 关闭后拒绝新消息并唤醒 pending Call。
- 页面收到重复或迟到的 finish 时按 Map 查找结果处理；Go 忽略找不到 pending Call 的回复。

## 后端数据配置

`SENTRY_CAPTURE_BODY_ROUTES` 使用逗号分隔的 `METHOD /path`，例如：

```dotenv
SENTRY_CAPTURE_BODY_ROUTES="POST /ai-interaction/turns,POST /ai-interaction/archives"
```

路由命中时，request 和 response body 分别保存最多 15 KiB，截断标记保存各自完整字节数。`request_id` 从响应或错误的内部 metadata 写入 transaction；`http.first_byte_ms` 从 transaction 开始计时，到首次写响应体时结束。

`ErrorWithMetadata` 保存原始 error 和 metadata 副本，`Error()` 保留错误文本，`Unwrap()` 保留 `errors.Is/As` 的错误链判断。`Interact` 的模型调用和命令参数解析错误出口、`Archive` 的模型调用错误出口通过 `wrapErrorWithMetadata()` 附带已取得的信息；`TracerInteraction` 使用 `errors.As` 提取后沿用 context metadata 记录器。

`replyWithInnerError()` 在映射为内部服务器错误的分支调用 `tracer.SetExtra(ctx, "error.message", err.Error())`。transaction 结束时将完整错误文本写入 span data；该记录独立于 body 捕获配置。HTTP 响应沿用统一的 `code/msg` 格式。

## 验证

在对应目录执行以下检查。Go WASM 构建示例使用 PowerShell：

```powershell
# builder/tools/ai
go test ./...

# builder/tools/ispx
go test ./...

# 在以上两个目录分别检查 WASM 构建
$env:GOOS = 'js'
$env:GOARCH = 'wasm'
go build ./...
Remove-Item Env:GOOS
Remove-Item Env:GOARCH

# builder/spx-gui
pnpm type-check
pnpm exec vitest run src/ispx/rpc.test.ts src/ispx/sentry-telemetry-adapter.test.ts src/utils/tracing.test.ts

# builder-backend
go test ./...
```

浏览器联调使用已配置 Sentry 且会执行 Sentry 初始化的运行环境，检查：

1. Interact 和 Archive 请求各自生成对应名称的独立 browser `http.client` root。
2. HTTP 请求带有页面返回的 `Sentry-Trace` / `Baggage`，后端 transaction 使用相同 trace ID。
3. 成功和失败请求分别结束为对应状态，请求 context 结束时走取消处理。
4. 配置 body 捕获后，后端 transaction 保存 API request/response body；超限 body 带有完整字节数标记。
5. 模型调用取得 completion ID 后，成功返回或随后流读取、响应解析失败时，后端 transaction 均包含 `request_id`。
6. 停止、重新运行及卸载后连接完成清理；并发请求按各自 RPC ID 和 operation ID 匹配。
7. 页面回调缺失或创建操作失败时，AI 请求继续通过底层 Transport 执行。
