# AI Interaction Sentry

AI Interaction 的请求监控通过 iSPX 消息通道连接浏览器与 Builder backend，记录单次交互请求和归档请求的耗时、状态及请求现场。

## Trace 结构

每次调用 `Transport.Interact` 或 `Transport.Archive` 时，iSPX 请求页面创建一个独立的 `http.client` root。页面生成的 `Sentry-Trace` 和 `Baggage` 随 HTTP 请求传到后端，后端续接这条 trace。

```text
http.client                   浏览器 WASM 请求，独立 root
└── http.server               Builder backend 处理请求
    └── http.client           后端 HTTP client 调用模型
```

浏览器 root 的名称为 `POST /ai-interaction/turns` 或 `POST /ai-interaction/archives`。每次重试经过 Transport 时创建新的 root，生命周期从创建监控操作持续到 Transport 返回。请求的限流等待发生在调用 Transport 之前。

后端模型 `http.client` 的计时覆盖底层 `RoundTrip` 调用；后端读取模型流、拼装结果和返回 API 响应的过程位于 `http.server` 生命周期内。

## 各层职责

| 层 | 职责 |
| --- | --- |
| `tools/ai` | 执行交互、命令和历史管理，通过 Transport 发起请求 |
| `tools/ispx/telemetry_transport.go` | 包装 Transport，创建监控操作，将传播请求头放入 context，并在请求返回时结束操作 |
| iSPX telemetry client | 构造通用 operation 消息，保存操作编号和传播请求头 |
| iSPX RPC client | 发送 JSON-RPC 请求和通知，匹配回复，处理取消与关闭 |
| Web Sentry adapter | 创建 Sentry span，返回传播请求头，设置状态并结束记录 |
| `wasmtrans` | 合并请求头，执行原生 `fetch`，处理网络取消和响应解析 |
| 后端 HTTP transaction | 续接 trace，记录 HTTP 状态、已配置的请求现场和请求期间积累的 metadata |

消息通道传递监控操作和传播请求头；AI 请求正文与响应正文通过 WASM 的 HTTP 请求传输。

## 请求链路

```text
Transport.Interact / Transport.Archive
  -> telemetryTransport 请求开始监控操作
  -> JSON-RPC: telemetry/operation.start
  -> 页面创建独立 Sentry span
  <- { operationId, propagationHeaders }
  -> 将传播请求头写入本次请求 context
  -> wasmtrans 合并 headers 并调用 fetch
  -> backend 续接 trace，调用模型并返回响应
  -> telemetryTransport 根据调用结果确定状态
  -> JSON-RPC: telemetry/operation.finish
  -> 页面更新状态，结束并移除对应 span
```

`telemetry/operation.start` 使用有回复的 RPC Call，默认等待上限为 500ms，也受原始请求 context 的取消和截止时间约束。开始操作失败时，包装层继续调用底层 Transport。未配置 telemetry client 时使用原始 Transport。

传播请求头通过 `ai.WithExtraHeaders` 保存在原始请求的派生 context 中。写入和读取时均复制 map。`wasmtrans` 按大小写不敏感的规则保护 `Authorization`、`Content-Type`、`Content-Length`、`Cookie`、`Host`、`Origin`、`Proxy-Authorization` 和 `Referer`。

## 操作数据和状态

开始消息包含操作名称 `name`、类型 `operation`、毫秒时间戳 `startTimeUnixMilli`，以及可选的 `attributes` 和 `propagation`。AI 请求使用 `operation=http.client`、`propagation=http`。

页面返回 `operationId` 和 `propagationHeaders`，结束消息使用相同的 `operationId`，携带 `endTimeUnixMilli`、`status` 和可选属性。页面接受字符串、数字和布尔值作为 span 属性。

| 结束状态 | 当前 Transport 包装的判定 |
| --- | --- |
| `ok` | 请求返回时 context 有效且调用成功 |
| `error` | 请求返回错误且 context 仍有效 |
| `cancelled` | 请求返回时 context 已取消或超过截止时间 |

Go 侧的 `Operation.Finish` 只执行一次。页面按操作编号查找记录，对重复或迟到的结束消息直接返回。

## 后端请求现场

后端用 `SENTRY_CAPTURE_BODY_ROUTES` 配置需要捕获 body 的路由，按 HTTP 方法和路径精确匹配。AI 接口配置示例：

```dotenv
SENTRY_CAPTURE_BODY_ROUTES="POST /ai-interaction/turns,POST /ai-interaction/archives"
```

命中路由后，后端将 API 的原始请求和响应 body 分别保存为 `request_body`、`response_body`，每份上限为 15 KiB。超过上限时保留前缀，并用 `request_body_dropped` 或 `response_body_dropped` 记录完整 body 的字节数。业务处理仍接收完整请求，客户端仍接收完整响应。

模型调用取得流式响应中的 completion ID 后，通过内部 metadata 将其写为 server transaction 的 `request_id` tag。成功时 metadata 随响应返回；流读取、响应完整性检查或命令参数解析失败时，metadata 随错误返回，由 `TracerInteraction` 统一写入请求 context。模型 HTTP client 还记录响应状态和配置允许的响应头；底层 `RoundTrip` 返回错误时写入 `http.error`。

server transaction 的 `http.first_byte_ms` 记录从 HTTP transaction 开始到首次调用响应体 `Write` 的时间。排查 API 返回内容时查看 `response_body`。统一错误出口 `replyWithInnerError()` 将映射为内部服务器错误的完整 `err.Error()` 写入 transaction 的 `error.message`，独立于 body 捕获配置。服务器错误日志同时记录错误原文，日志中的 `sentry_trace_id` 可用于关联对应 trace。

## 运行生命周期

`ProjectRunner` 为使用 AI Interaction 的运行准备 endpoint、token provider 和消息回调，并创建对应的 RPC session。Go 侧收到回调后创建 RPC client 和 telemetry client，再安装带监控的默认 Transport。

一次 Think 开始时保存当时的 Transport，后续请求及由其安排的历史归档沿用该实例。Transport 包装保存所属运行的 telemetry client。

停止、重新运行、卸载组件、重载 iframe、游戏错误或退出时，Runner 关闭消息 session。页面中止等待中的 RPC 处理并结束剩余 span；Go 侧关闭 RPC client，唤醒等待回复的调用。关闭的 session 拒绝后续工作，无法匹配的迟到回复被忽略。网络请求通过请求 context 和 `AbortController` 执行取消。

## 采样与查看

页面 Sentry 使用 `VITE_SENTRY_ISPX_SAMPLE_RATE` 配置 AI 请求 root 的采样率，当前默认值为 `1`。每个 root 使用独立 trace；页面自动 fetch tracing 排除两个 AI URL，由 iSPX 负责创建请求记录。后端启用 tracing，通过 `SENTRY_SAMPLE_RATE` 提供默认采样率，并续接传入的 trace 和采样信息。前后端 Sentry 初始化均依据运行环境执行，开发环境会跳过初始化。

在 Sentry 中按 `POST /ai-interaction/turns` 或 `POST /ai-interaction/archives` 查找浏览器 transaction，沿相同 trace 查看后端请求。浏览器记录展示本次 Transport 调用耗时及状态，后端记录提供 HTTP 处理过程和已配置的 API 请求现场。

代码位置和验证步骤见 [实现说明](./ai-interaction-sentry-implementation.md)。
