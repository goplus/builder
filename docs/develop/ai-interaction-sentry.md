# AI Interaction Sentry

AI Interaction 的请求监控通过 iSPX Trace Hook 连接页面中的 Sentry 和 WASM 中的 AI Transport。Hook 只负责创建、结束 trace 以及提供传播请求头；AI 请求仍由 `wasmtrans` 使用浏览器原生 `fetch` 发出。

## Trace 结构

每次调用 `Transport.Interact` 或 `Transport.Archive` 时，iSPX 请求页面创建一个独立的 `http.client` root。页面生成的 `Sentry-Trace` 和 `Baggage` 随 HTTP 请求传到后端，后端续接这条 trace。

```text
http.client                   浏览器 WASM 请求，独立 root
└── http.server               Builder backend 处理请求
    └── http.client           后端 HTTP client 调用模型
```

浏览器 root 的名称为 `POST /ai-interaction/turns` 或 `POST /ai-interaction/archives`。每次重试经过 Transport 时创建新的 root，生命周期从调用 Transport 开始持续到 Transport 返回。请求的限流等待发生在调用 Transport 之前。

后端模型 `http.client` 的计时覆盖底层 `RoundTrip` 调用；后端读取模型流、拼装结果和返回 API 响应的过程位于 `http.server` 生命周期内。

## 各层职责

| 层 | 职责 |
| --- | --- |
| `tools/ai` | 执行交互、命令和历史管理，通过 Transport 发起请求 |
| `tools/ispx/trace_transport.go` | 包装 Transport，调用 Trace Hook，将传播请求头放入 context，并在请求返回时结束 trace |
| `tools/ispx/trace_hook_wasm.go` | 保存页面注入的 Hook，完成 Go 与 JavaScript 的直接调用和容错 |
| `spx-gui/src/ispx/sentry-trace-hook.ts` | 创建独立 Sentry span，返回传播请求头和该 span 对应的 `finish` 函数 |
| `wasmtrans` | 合并请求头，执行原生 `fetch`，处理网络取消和响应解析 |
| 后端 HTTP transaction | 续接 trace，记录 HTTP 状态、已配置的请求现场和请求期间积累的 metadata |

Trace Hook 不传输 AI 请求正文或响应正文，也不替代 `wasmtrans`。它只是页面注入给 iSPX 的一个可选回调入口。

## 请求链路

```text
Transport.Interact / Transport.Archive
  -> traceTransport 调用页面 Trace Hook
  -> 页面创建独立 Sentry span
  <- { propagationHeaders, finish }
  -> 将传播请求头写入本次请求 context
  -> wasmtrans 合并 headers 并调用原生 fetch
  -> backend 续接 trace，调用模型并返回响应
  -> traceTransport 根据调用结果得到 ok / error / cancelled
  -> 调用本次操作对应的 finish(status)
  -> 页面更新状态并结束 span
```

这里使用 “Hook” 是因为页面把一个函数注入到 iSPX 的固定扩展点，iSPX 在请求开始时回调它，从而挂接额外的观测逻辑。它不是 React Hook，也不是 WebHook。Hook 返回的 `finish` 闭包已经绑定本次 span，因此不需要 JSON-RPC、请求 ID 或页面侧 pending map。

创建 trace、读取传播信息、设置状态或结束 span 任一步失败时，Hook 都按 best effort 处理，底层 AI 请求继续执行。未安装 Hook 时，直接使用原始 Transport。

传播请求头通过 `ai.WithExtraHeaders` 保存在原始请求的派生 context 中。写入和读取时均复制 map。`wasmtrans` 按大小写不敏感的规则保护 `Authorization`、`Content-Type`、`Content-Length`、`Cookie`、`Host`、`Origin`、`Proxy-Authorization` 和 `Referer`。

## 操作状态

| 结束状态    | 当前 Transport 包装的判定               |
| ----------- | --------------------------------------- |
| `ok`        | 请求返回时 context 有效且调用成功       |
| `error`     | 请求返回错误且 context 仍有效           |
| `cancelled` | 请求返回时 context 已取消或超过截止时间 |

Go 侧和页面侧都保证每个 `finish` 最多生效一次。Runner 关闭 Hook 时，页面将仍未完成的 span 结束为 `cancelled`。

## 后端请求现场

后端用 `SENTRY_CAPTURE_BODY_ROUTES` 配置需要捕获 body 的路由，按 HTTP 方法和路径精确匹配。AI 接口配置示例：

```dotenv
SENTRY_CAPTURE_BODY_ROUTES="POST /ai-interaction/turns,POST /ai-interaction/archives"
```

命中路由后，后端将 API 的原始请求和响应 body 分别保存为 `request_body`、`response_body`，每份上限为 15 KiB。超过上限时保留前缀，并用 `request_body_dropped` 或 `response_body_dropped` 记录完整 body 的字节数。业务处理仍接收完整请求，客户端仍接收完整响应。

模型调用取得流式响应中的 completion ID 后，通过内部 metadata 将其写为 server transaction 的 `request_id` tag。成功时 metadata 随响应返回；流读取、响应完整性检查或命令参数解析失败时，metadata 随错误返回，由 `TracerInteraction` 统一写入请求 context。模型 HTTP client 还记录响应状态和配置允许的响应头；底层 `RoundTrip` 返回错误时写入 `http.error`。

server transaction 的 `http.first_byte_ms` 记录从 HTTP transaction 开始到首次调用响应体 `Write` 的时间。排查 API 返回内容时查看 `response_body`。统一错误出口 `replyWithInnerError()` 将映射为内部服务器错误的完整 `err.Error()` 写入 transaction 的 `error.message`，独立于 body 捕获配置。服务器错误日志同时记录错误原文，日志中的 `sentry_trace_id` 可用于关联对应 trace。

## 运行生命周期

`ProjectRunner` 为使用 AI Interaction 的运行准备 endpoint、token provider 和 Trace Hook。Go 侧收到 Hook 后，用它包装原生 `wasmtrans`，再安装默认 Transport。

一次 Think 开始时保存当时的 Transport，后续请求及由其安排的历史归档沿用该实例。旧 Transport 即使仍持有旧 Hook，Hook 关闭后也只会返回空结果，AI 请求仍可继续。

停止、重新运行、开始新运行、卸载组件、重载 iframe、游戏错误或退出时，Runner 都会关闭当前 Hook。关闭只清理观测资源，不负责取消 HTTP；网络请求仍通过原始请求 context 和 `AbortController` 取消。

## 采样与查看

页面 Sentry 使用 `VITE_SENTRY_ISPX_SAMPLE_RATE` 配置 AI 请求 root 的采样率，当前默认值为 `1`。每个 root 使用独立 trace；页面自动 fetch tracing 排除两个 AI URL，由 iSPX 负责创建请求记录。后端启用 tracing，通过 `SENTRY_SAMPLE_RATE` 提供默认采样率，并续接传入的 trace 和采样信息。前后端 Sentry 初始化均依据运行环境执行，开发环境会跳过初始化。

在 Sentry 中按 `POST /ai-interaction/turns` 或 `POST /ai-interaction/archives` 查找浏览器 transaction，沿相同 trace 查看后端请求。浏览器记录展示本次 Transport 调用耗时及状态，后端记录提供 HTTP 处理过程和已配置的 API 请求现场。

代码位置和验证步骤见 [实现说明](./ai-interaction-sentry-implementation.md)。
