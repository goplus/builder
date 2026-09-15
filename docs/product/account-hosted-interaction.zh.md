# XBuilder Account hosted interaction

XBuilder Account hosted interaction 是 Account Web 在身份解析或账号管理操作需要用户决策时承载的多步骤流程。它位于自动身份解析与最终账号、identity binding、Account session 或 OAuth continuation 结果之间，用于处理 unbound provider identity 的首次登录、创建账号前的 profile completion、绑定已有账号、current Account session 与第三方身份归属冲突，以及用户在 Account Web 中添加或移除登录方式等需要用户参与的场景。

[XBuilder Account 文档](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/docs/product/account.zh.md)是已实现账号系统的设计快照。本文在该基线的产品与系统边界内，进一步给出 hosted interaction 的专项产品与架构设计，定义目标行为、状态所有权、流程边界、安全约束和首期交付范围。最终 HTTP path、OpenAPI schema、数据库列和迁移步骤仍应在实现时分别落实到 [OpenAPI](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/docs/openapi.yaml)、后端和 Account Web，但不得改变本文定义的产品不变量。

## 目标

- Unbound provider identity 在创建 `user`、创建 `user_identity` 或完成 OAuth authorization 之前始终经过用户决策
- 让用户在创建 Account user 前明确确认 `username`，并检查 `displayName` 和 `avatar`
- 允许用户证明自己控制某个已有 Account user，再把 unbound provider identity 作为新的登录方式绑定到该用户
- 让用户在 Account Web 中查看、添加和移除第三方登录方式，且不允许用户自助移除最后一个用户可管理的登录方式
- 在 current Account session 与 provider-resolved user 不一致时要求用户明确选择，不静默切换账号
- 让 OAuth-originated flow、provider credential handoff 和 Account Web 本地账号管理共享同一套身份归属规则
- 让 reload、back、retry、provider callback、并发提交、过期和 replay 都由服务端状态机给出确定结果
- 让账号创建、身份绑定、session 变更、OAuth continuation 和安全审计具有一致且可追踪的完成边界

## 非目标

- 不合并两个已有 Account user，也不迁移它们已经拥有的项目、授权、session 或其他产品资源
- 不根据 email、username、display name、avatar 或其他 provider profile 字段自动匹配、推荐或绑定已有 Account user
- 不提供普通用户的用户名和密码公开注册、密码设置、密码重置或 account recovery
- 不允许把一个已经绑定到其他 Account user 的 provider identity 移动到当前用户
- 不把 provider profile 作为 Account user profile 的持续同步来源
- 不保存 provider access token、refresh token、ID token、authorization code 或长期 provider credential
- 不为第三方 app 开放可定制的身份编排规则

## 核心概念

| 概念 | 含义 |
| - | - |
| Provider credential | Hosted provider acquisition 或 provider credential handoff 取得的短生命周期第三方凭证 |
| Verified provider identity | Account 已经验证 provider credential，并按 provider 规则规范化后的稳定身份键和有限 profile snapshot |
| Bound provider identity | 已经存在有效 `user_identity`，且其稳定 provider identity key 唯一指向某个 Account user |
| Unbound provider identity | 已验证稳定 provider identity key，但不存在 canonical 或受支持的 legacy binding |
| Pending provider identity | Hosted interaction 当前持有、尚未完成账号创建、绑定或账号选择的 verified provider identity |
| User-managed sign-in method | 用户可以在 Account Web 中添加，并在不移除最后一个用户可管理登录方式的前提下移除的第三方 identity binding。每条有效 `user_identity` 均单独计为一个，包括同一 provider 下不同 stable subject 的 bindings。管理员托管密码不属于这一集合 |
| Sign-in context | 在尚未产生需要用户决策的 verified provider identity 前，保存 OAuth PAR 或 Account Web 本地 continuation 的短生命周期 protocol state |
| Hosted interaction | 一次需要用户决策的多步骤交互及其服务端权威状态，具有不可变 origin、purpose、absolute expiry 和唯一 terminal result |
| Interaction attempt | 由 hosted interaction 发起和约束的一次 provider redirect、密码验证或其他 proof attempt。每次 attempt 都有独立的短生命周期状态，且只能消费一次 |
| Current Account session | 浏览器当前请求携带的 Account session。它是 interaction 的输入上下文，不自动决定 effective user，也不能单独授权敏感账号操作 |
| Fixed target user | 由 purpose 在 interaction 创建时确定、后续不得 retarget 的 Account user |
| Fixed target identity | 由 Remove sign-in method purpose 在 interaction 创建时确定、后续不得替换的 `user_identity` |
| Proof of control | 为当前 interaction 和敏感操作 purpose 重新进行的认证，用于证明用户控制某个已有 Account user |
| Effective user | Hosted interaction 成功后唯一确定的 Account user。最终 Account session 和 OAuth authorization code 必须属于该用户 |
| Absolute expiry | Interaction 创建时确定且不因 reload、retry 或新 attempt 而延后的过期时间 |
| Trusted continuation | 服务端根据已验证 origin 保存的 continuation。OAuth origin 使用被 interaction claim 的 PAR 所确定的 trusted app callback，Account Web local origin 使用服务端枚举的固定目标 |
| Terminal status | Interaction 不再接受 transition 时的 status，包括 `completed`、`cancelled`、`expired` 和 `invalidated` |
| Terminal result | Interaction 进入 terminal status 时提交的唯一不可变结果，包括成功的 effective user 与 continuation，或取消、过期和安全失效结果 |

本文后续将单个 hosted interaction 简称为 interaction。Interaction attempt 具有独立的一次性状态，但其 purpose、expected step 和 expiry 均受所属 interaction 约束。

Provider identity 的稳定键由 provider、subject namespace 和 stable subject 组成。Provider username、display name、avatar 和 email 都不是身份键。本文中的“绑定账号”只表示创建一条 `user_identity` 到已有 `user` 的关联，不表示合并两个 `user`。

本文中的 unlink 与 Remove sign-in method 指同一操作，只表示删除一个 Account user 与 provider identity 之间的 `user_identity` binding。它不删除 Account user，不移动或合并其他 identity，也不改变该用户拥有的产品资源。

`username` 是可变 Account handle，不能作为稳定账号引用。所有持久化关联、session、OAuth token subject 和产品资源仍使用 `user.id`。

## 当前实现差距

当前后端的 [`ResolveProviderIdentity`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/account/provider_identity_service.go#L79-L116) 在查不到已有或 legacy identity 后直接选择 provider-derived username，[`createUserIdentity`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/account/provider_identity_service.go#L219-L277) 随后在一个事务中创建 `user` 和 `user_identity`。Hosted provider callback 还会立即创建 Account session。这个实现没有在 verified identity lookup 与账号创建之间保留用户决策边界。

[`CreatePushedAuthorizationRequest`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/account/auth_flow_service.go#L166-L244) 也会在 provider credential handoff 创建 PAR 时立即解析并创建用户，再把 `providerUserID` 和 `providerIdentityID` 写入 PAR payload。当前 [`account_auth_flow`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/model/account_auth_flow.go#L10-L52) 只表示 PAR、provider redirect state、authorization code 和 provider credential handoff 等彼此独立的一次性协议产物，没有可恢复的多步骤 hosted interaction 状态。

当前 [OpenAPI 的 hosted sign-in endpoints](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/docs/openapi.yaml#L44-L188) 和 Account Web 只支持 provider acquisition、密码登录、current Account session continuation 与 OAuth continuation。它们没有 interaction projection、profile completion、purpose-specific proof、link confirmation、account selection 或 Account Web 身份添加与移除契约。[XBuilder OAuth callback parser](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/spx-gui/src/utils/oauth/index.ts#L35-L49) 也只处理 `code` 和 `state`，尚不能正确处理 OAuth authorization error callback。

因此，hosted interaction 不能通过继续扩充“查找或创建用户”函数实现。后端必须先拆分 provider verification、identity lookup、interaction decision 和 terminal completion。

## 分层模型

一次登录或身份添加由以下四层组成：

1. Credential acquisition：通过 hosted provider acquisition、provider credential handoff 或管理员托管密码取得认证输入
2. Identity verification and lookup：验证输入，并只按稳定 provider identity key 或密码所属用户查找已有 Account user
3. Interaction decision：判断是否可以直接完成，或是否必须创建或恢复 hosted interaction 让用户作出决定
4. Continuation：为唯一 effective user 创建或更新 Account session，并完成 OAuth authorization 或 Account Web 本地操作

这些层是职责边界，不是只能按顺序执行一次的线性时序。Hosted interaction 的权威决策状态属于第三层。它可以发起属于第一层的 interaction attempt，但不替代 provider verification、OAuth PAR、authorization code issuance 或 token exchange。

如果 bound provider identity 没有 session 冲突，通常可以直接继续。Unbound provider identity 无论 provider metadata 是否完整，都必须进入 hosted interaction。Provider credential handoff 只改变第一层的 credential acquisition 方式，不得绕过后续三层。

Provider authorization code 或 handoff code 在验证时仍须原子消费，并在消费后立即丢弃。Hosted interaction 只接收 verified identity result。验证成功但后续状态持久化失败时，旧 provider code 也不能重用，retry 必须取得新的 provider credential。

## Origin 与 purpose

Hosted interaction 的 origin 在创建时确定，之后不可更改。

| Origin | 权威上下文 | 成功 continuation | 失败或取消 continuation |
| - | - | - | - |
| OAuth authorization | 已验证并被 interaction 唯一 claim 的 app 与 PAR | trusted app callback 的 `code` 和原始 app `state` | trusted app callback 上的标准 OAuth error 和原始 app `state`，或 Account-owned error surface |
| Account Web local | 服务端枚举的本地目标，不接受任意 return URL | Account Web 中的固定页面 | Account Web 中的取消、过期或错误页面 |

Hosted interaction 的 purpose 决定可执行动作。

| Purpose | fixed target user | 允许的结果 |
| - | - | - |
| Resolve sign-in | 无 | 创建新用户、绑定已有用户、选择冲突账号、取消 |
| Add sign-in method | 有，来自发起操作的 Account session | 把 unbound provider identity 绑定到 fixed target user、报告已绑定、拒绝其他用户归属、取消 |
| Remove sign-in method | 有，来自发起操作的 Account session | 移除 fixed target identity、拒绝不满足约束的操作、取消 |

Add sign-in method 和 Remove sign-in method 只允许使用 Account Web local origin，并由有效 Account session 发起。OAuth authorization origin 和 app OAuth access token 都不能发起这两个 purpose 的 interaction。

Account Web 本地登录不是伪造一个 app 或 PAR。用户直接打开 Account Web 且没有 Account session 时，后端创建短生命周期 local sign-in context。登录完成后只能进入服务端允许的 Account Web 页面。任意浏览器传入 URL 都不能成为 continuation。

普通 sign-in 在 verified provider identity 出现前可以只使用 sign-in context。只有 identity lookup 产生需要用户决策的结果时才创建 hosted interaction。`Add sign-in method` 在 provider acquisition 前就已经存在敏感操作和 fixed target user，因此应先创建 hosted interaction，再从该 interaction 启动 provider attempt。`Remove sign-in method` 也应在操作开始时创建 interaction，并把 initiating session user 和用户选择的已有 identity 固定为 target。

## 进入条件

以下表格中的 A 表示 current Account session user，B 表示 provider identity 已绑定的 user。

| Identity state | Account context | Purpose | 行为 |
| - | - | - | - |
| 尚未取得 provider identity | current Account session A | Resolve sign-in | 可以直接以 A 继续，也可以由用户明确启动其他登录方式 |
| 尚未取得 provider identity | 没有 current Account session | Resolve sign-in | 留在 sign-in context 中选择登录方式 |
| bound provider identity，属于 B | 没有 current Account session | Resolve sign-in | 以 B 直接继续，不进入 hosted interaction |
| bound provider identity，属于 B | current Account session B | Resolve sign-in | 复用 B 并直接继续，不进入 hosted interaction |
| bound provider identity，属于 B | current Account session A，且 A 不等于 B | Resolve sign-in | 创建 account selection interaction，不静默保留 A 或切换到 B |
| unbound provider identity | 任意 | Resolve sign-in | 始终创建 create-or-link interaction |
| unbound provider identity | fixed target user A | Add sign-in method | 进入 A 的 purpose-specific proof 与 link confirmation |
| bound provider identity，属于 A | fixed target user A | Add sign-in method | 报告该 identity 已经属于 A，不创建重复 binding |
| bound provider identity，属于 B，且 B 不等于 A | fixed target user A | Add sign-in method | 拒绝本次 identity，返回 `acquireIdentity`，不允许切换、移动或合并 |
| fixed target identity 属于 A，且 A 还有其他用户可管理的登录方式 | current Account session A | Remove sign-in method | 进入 A 的 purpose-specific proof 与 unlink confirmation |
| fixed target identity 不属于 A，或 A 没有其他用户可管理的登录方式 | current Account session A | Remove sign-in method | 拒绝创建或推进 interaction，不移除 identity |

这里的 unbound provider identity 只表示稳定 provider identity key 没有 binding。Provider metadata 是否能生成合法 username、是否与某个用户相似、当前浏览器是否已有 session，都不能改变该判断。

## Unbound provider identity 的不变量

Unbound provider identity 必须先进入 hosted interaction，且在用户完成一个明确的最终操作前：

- 不创建 `user`
- 不创建 `user_identity`
- 不创建或切换 Account session
- 不把某个已有用户写入 PAR 作为已解析用户
- 不签发属于该 identity 的 OAuth authorization code
- 不把 provider metadata 用作账号搜索或账号建议

Resolve sign-in purpose 提供三个一级选择：

- 创建新的 Account user
- 绑定已有 Account user
- 取消

如果浏览器具有 current Account session，UI 可以把该 session user 显示为一个已经认证过的候选目标，但 session 本身不构成绑定授权。用户仍要明确选择 link，完成 purpose-specific proof，再确认绑定。

如果浏览器没有 current Account session，Account 不显示任何基于 provider metadata 推测的已有用户。选择 link 后，用户通过已有登录方式完成认证。只有认证成功后，Account 才显示被证明控制的 target user。

选择 create、选择 link、完成 proof 和最终 confirmation 是不同的 transition。任何一步失败、取消或过期都不能回退到自动创建用户。

## Hosted interaction 状态

### 持久化边界

Hosted interaction 应使用独立于 `account_auth_flow` 的逻辑持久化模型。`account_auth_flow` 继续保存短生命周期、单次消费的 protocol artifact。Hosted interaction 则保存多步流程的权威状态、当前 step、version、absolute expiry 和 terminal result。把 interaction 伪装成一种普通 auth flow 会混淆“可恢复的状态机”与“一次性 credential”的消费语义。

具体物理 schema 可以调整，但 interaction 至少需要表达：

- 不可变的 origin 和 purpose
- 内部 correlation ID，以及只保存 hash 的外部 opaque handle
- Browser continuity binding，与 Account session 分离
- OAuth origin 的 app、PAR 和 trusted continuation，或 Account Web local origin 的固定 continuation key
- Account Web 登录方式管理 purpose 的 fixed target user 和 initiating session，以及 Remove sign-in method 的 fixed target identity
- Interaction 创建时的 current Account session reference，以及后续 session 变更的处理依据
- Verified provider identity context，包括 unbound provider identity 的稳定 key 或 bound provider identity 的内部 reference，以及有界 provider profile snapshot
- 当前 step、乐观并发 version、创建时间、更新时间和 absolute expiry
- 已证明控制的 target user、proof reference 和 proof expiry
- 用户已经确认的 profile draft 或 account selection
- terminal status、有界原因类别、effective user 和完成时间

Interaction 不保存 provider code、provider token、OAuth authorization code、session token、密码或 app secret。稳定 provider subject 是完成 binding 所必需的服务端数据，只能保存在受控的短生命周期 interaction state 中，不得返回给 hosted interaction UI 或写入普通日志。

Provider profile snapshot 只允许包含 provider 名称、规范化 identity key、provider username、provider display name、provider avatar URL、验证时间和已有 binding 的内部 reference。字段必须有长度和格式上限。Email、完整 provider payload、token claims 和 provider error body 不进入 interaction state。Snapshot 只用于展示和 profile suggestion，terminal completion 仍以数据库中的实时 identity 归属为准。

### 状态模型

| Status | 含义 |
| - | - |
| `active` | 允许读取当前 projection，并按当前 step 执行有限动作 |
| `completed` | 已经提交唯一成功结果，不再接受 transition |
| `cancelled` | 用户明确取消整个 interaction |
| `expired` | 到达 absolute expiry |
| `invalidated` | 身份归属、origin、purpose 或其他安全前提发生不可恢复变化 |

`completed`、`cancelled`、`expired` 和 `invalidated` 都是 terminal status。处于 terminal status 的 interaction 不得恢复为 `active`，也不得通过 retry、reload 或迟到 callback 改变 effective user 或 terminal result。

### 步骤模型

处于 `active` 状态的 interaction 根据 purpose 和已验证事实处于下列 step 之一：

| Step | 允许的主要动作 |
| - | - |
| `acquireIdentity` | 从 Add sign-in method interaction 启动 provider attempt |
| `chooseResolution` | 对 unbound provider identity 选择 create、link 或 cancel |
| `completeProfile` | 编辑并提交新用户 profile |
| `proveAccountControl` | 通过已有登录方式证明控制 target user |
| `confirmLink` | 检查 pending provider identity 与 target user，并明确确认 binding |
| `confirmUnlink` | 检查 fixed target identity、target user 和 proof，并明确确认移除 binding |
| `selectAccount` | 在 current Account session user 与 provider-resolved user 之间明确选择 |

Interaction 创建时，后端根据 purpose 和已经验证的事实确定初始 step：

| 创建场景 | 初始 step |
| - | - |
| Resolve sign-in 得到 unbound provider identity | `chooseResolution` |
| Resolve sign-in 得到与 current Account session user 不同的 bound provider identity | `selectAccount` |
| Add sign-in method 尚未取得 provider identity | `acquireIdentity` |
| Remove sign-in method 已固定 target user 和 target identity | `proveAccountControl` |

普通 Resolve sign-in 的 provider acquisition 发生在 sign-in context 中。只有 verified identity lookup 产生需要用户决策的结果时才创建 interaction，不会先创建一个处于 `acquireIdentity` 的 interaction。

后端根据已经持久化的事实计算初始 step 和后续 step。浏览器不能指定 step，也不能提交 provider subject、target user ID、effective user ID、app callback 或其他权威状态。

Interaction 创建后的主要 transition 如下：

| 当前 step | 已验证动作或结果 | 下一状态 |
| - | - | - |
| `acquireIdentity` | Add sign-in method 的 provider attempt 返回 unbound provider identity | `proveAccountControl` |
| `acquireIdentity` | Add sign-in method 的 provider attempt 返回属于 fixed target user 的 bound provider identity | `completed`，已绑定且不执行变更 |
| `acquireIdentity` | Add sign-in method 的 provider attempt 返回属于其他 user 的 bound provider identity | `acquireIdentity`，拒绝本次 attempt |
| `chooseResolution` | 用户选择 create | `completeProfile` |
| `chooseResolution` | 用户选择 link | `proveAccountControl` |
| `completeProfile` | 有效的最终提交 | `completed` |
| `proveAccountControl` | Resolve sign-in 或 Add sign-in method 的有效 existing-account proof | `confirmLink` |
| `proveAccountControl` | Remove sign-in method 的有效 existing-account proof | `confirmUnlink` |
| `confirmLink` | 有效的最终 confirmation | `completed` |
| `confirmUnlink` | 有效的最终 confirmation | `completed` |
| `confirmUnlink` | Proof 失效，但 fixed target identity 与剩余登录方式约束仍然成立 | `proveAccountControl` |
| `confirmUnlink` | Fixed target identity 或剩余登录方式约束不再成立 | `invalidated` |
| `selectAccount` | 用户选择 current Account session user 或 provider-resolved user | `completed` |
| 任意 `active` step | 用户明确取消整个 interaction | `cancelled` |
| 任意 `active` step | 到达 absolute expiry | `expired` |
| 任意 `active` step | Identity 归属或其他安全前提发生不可恢复变化 | `invalidated` |

Interaction 同一时刻最多保存一个 pending provider identity。Add sign-in method flow 从 `confirmLink` 或 `proveAccountControl` 返回 provider 选择时，必须显式失效 proof 并清除旧 pending provider identity，再回到 `acquireIdentity`。Resolve sign-in flow 从 `completeProfile`、`proveAccountControl` 或 `confirmLink` 返回 `chooseResolution` 时可以保留 non-authoritative draft，但不得保留可以绕过后续 step 的 proof 或 confirmation。Remove sign-in method flow 从 `confirmUnlink` 返回 proof method 选择时必须失效旧 proof。所有返回动作都是由服务端执行的 transition。

### Interaction attempt 的生命周期

一个 interaction 可以发起多次 attempt，但任何 attempt 都不能创建另一个 interaction。

- Provider redirect、密码 proof 和 provider proof 都必须绑定 interaction ID、purpose、expected step 和 interaction 的 absolute expiry
- 每个 attempt 只允许消费一次，即使 provider 拒绝、密码错误或 callback 失败也不能重用
- 可恢复错误只消费本次 attempt，interaction 保持 `active`，retry 创建新的 attempt
- attempt 的 expiry 不得晚于 interaction 的 absolute expiry
- retry 不得延长 interaction 的 absolute expiry
- 迟到 callback 只能被识别为 stale 或 consumed，不能重放旧 step

普通 OAuth sign-in context 中的 provider acquisition 可以发生在 interaction 创建之前。Add sign-in method 和 proof provider acquisition 则必须作为已有 interaction 的 attempt。

### PAR 所有权

一个有效 PAR 在逻辑上最多被一个 hosted interaction claim。Claim 必须发生在 `request_uri` 仍有效时，并把已经验证的 authorization request 与 trusted continuation 不可变地绑定到 interaction。`GET /account/oauth/authorize` 对同一 `request_uri` 的重复调用应恢复同一个处于 `active` 状态的 interaction，而不是创建多个相互竞争的 interaction、选择不同用户或签发多个 authorization codes。

Claim 不等于消费。PAR 可以在 interaction 为 `active` 时保持由该 interaction 独占，并在 interaction 进入 terminal status 时被原子消费。Interaction 进入 `expired`、`cancelled` 或 `invalidated` 后，也必须让该 PAR 不能再启动竞争流程。

## Browser continuity 的绑定

Hosted interaction handle 必须是高熵 opaque value，数据库只保存其 hash。Account Web route 可以携带该 handle 用于定位 interaction，但 handle 不是浏览器可以修改的状态 payload。

Interaction 还应绑定独立的 browser continuity cookie。该 cookie 使用 `__Host-` 约束、`HttpOnly`、`Secure`、`SameSite=Lax`、`Path=/` 且不设置 `Domain`。它只证明同一浏览器流程的连续性，不证明用户身份，也不替代 Account session、provider state 或 purpose-specific proof。

Cookie value 必须高熵且不编码 interaction、user 或 session 信息。Interaction 只保存该 value 的 hash 或 keyed digest。同一个 browser continuity 可以绑定多个彼此独立的 interaction，但任何 interaction handle 都不能访问另一个 interaction。

Interaction 应优先继承 sign-in context 已经建立的 browser continuity。Provider credential handoff 等此前没有访问 Account Web 的流程可以让高熵 interaction handle 在第一次 Account Web 请求中承担一次 bootstrap capability，并原子建立 cookie binding。建立 binding 后，只有 interaction handle 而没有匹配 continuity 的请求不能读取或推进 interaction。

Browser continuity 必须与 Account session 分离，因为 interaction 可以匿名开始，过程中可以从 user A 切换到 user B，也可能在没有 Account session 时完成 provider handoff。IP 地址和 User-Agent 只能用于审计和异常检测，不能作为授权绑定。

原始 interaction handle、browser continuity value、PAR `request_uri`、app OAuth `state`、provider state 和 proof handle 都不得进入普通日志、access log、analytics URL 或第三方前端监控 payload。Account Web hosted interaction route 应使用 `Referrer-Policy: no-referrer`，并在 ingress 与 application logging 中对 interaction path 和 query 做结构化 redaction。

## 创建新 Account user

用户只有在 `chooseResolution` 明确选择 create 后才进入 `completeProfile`。Profile form 的最终提交同时表示“使用这个 profile 创建新 Account user”的明确确认。

Bound provider identity 的直接完成，以及在 `chooseResolution` 中选择 link，都不进入 profile completion。Link completion 只创建 `user_identity`，不得使用 pending provider metadata 覆盖 target user 的 `username`、`displayName` 或 `avatar`。

流程如下：

1. 后端返回由 provider metadata 或 Account 默认策略生成的 profile suggestions，但不创建 `user`
2. 用户确认或修改 `username` 和 `displayName`，并检查 avatar suggestion
3. 后端对字段进行格式校验，并可提供 advisory username availability 结果
4. 用户最终提交 profile
5. 后端在权威完成事务中重新检查 interaction、provider identity 归属和 username uniqueness
6. 后端原子创建 `user`、初始 `user_identity`、用于产生必需审计事件的持久记录，以及当前流程需要的 session 和 OAuth authorization state
7. Interaction 进入 `completed`，effective user 是新建用户

### Profile 字段策略

| 字段 | 行为 |
| - | - |
| `username` | 必填。可以预填合法 provider username 或 Account 生成的中性候选值，但用户必须通过最终提交明确确认。候选值不得直接编码 provider subject，也不得由其派生出可关联值 |
| `displayName` | 必填、可编辑。优先使用合法 provider display name，其次使用 provider username 或用户已选择的 username |
| `avatar` | 显示 provider avatar 或 Account 默认 avatar 的预览。用户可以接受 provider suggestion 或改用默认 avatar |

`username` 沿用 Account 的现有格式约束，只接受 1 到 100 个 ASCII 字母、数字、下划线或连字符，并按 case-insensitive uniqueness 判断。`displayName` 沿用现有 1 到 100 个 Unicode characters、无首尾空白和无换行约束。最终 OpenAPI 应复用同一 schema，不能为 hosted interaction 另造宽松规则。

Profile completion 不提供自定义 avatar 上传。账号创建后，用户仍可通过现有 avatar update 能力修改头像。

Provider metadata 只产生一次性 suggestion。账号创建后，后续 provider 登录不得覆盖 `username`、`displayName` 或 `avatar`。

Profile completion 不收集 email、bio、roles、plan、capabilities、产品偏好或授权信息。

### `username` 可用性

Username availability check 只改善交互，不构成 reservation。最终创建事务中的 case-insensitive database uniqueness constraint 才是权威结果。

如果 advisory check 后发生并发冲突，后端保留用户已经填写的其他字段，interaction 回到 `active` 状态的 `completeProfile`，提示用户选择另一个 `username`。它不得自动添加后缀后继续创建，也不得因此绑定到拥有该 `username` 的已有用户。

Username availability API 必须限流，并使用不会泄露账号存在性以外额外信息的稳定响应。绑定已有账号的 flow 不得复用该 API 来推荐 target user。

### Provider avatar 的转存

Provider avatar 是外部不可信 URL。Account Web 不得直接加载该 URL 作为预览，以免向 provider 或任意外部主机暴露浏览器网络信息和 interaction referrer。后端应通过受控 importer 或 image proxy 获取，并限制 scheme、redirect、目标网络、响应大小、media type 和 decode 后尺寸，防止 SSRF 与 image bomb，再向 Account Web 提供 Account-owned 临时预览。若用户接受 provider avatar，最终值必须转存为 Account-owned avatar，provider URL 不能成为长期 Account avatar 权威值。

外部 I/O 不应发生在持有数据库完成锁的事务内。实现可以先生成带 TTL 的临时对象，再在完成事务中引用最终对象，并通过幂等清理机制删除失败或过期流程留下的临时对象。Avatar import 失败属于可恢复错误，用户可以 retry 或选择默认 avatar。

## 绑定已有 Account user

把 provider identity 加入已有 Account user 会永久增加一种登录方式，因此必须同时具备：

- 已验证且在数据库中仍不存在 binding 的 pending provider identity
- 针对当前 interaction 和 link purpose 的新 proof of control
- 对 pending provider identity 与 target user 的明确最终 confirmation

普通 Account session 即使刚创建也不满足 proof 要求。Session 只说明浏览器当前持有某个登录态，不能单独授权新增登录方式。

### 可用的 proof 方法

可用的 proof 方法包括：

- 通过 target user 已经绑定且当前可用于 proof 的 provider identity 重新认证
- 通过 target user 的管理员托管 username 和 password 重新认证

本次 pending provider identity 本身不能证明 target user。另一个 unbound provider identity 也不能证明 target user。Provider proof 必须解析到已有 binding，password proof 必须解析到已有 password credential。

“可用于 proof”要求 provider 当前启用、adapter 能从当前 interaction 启动一笔新的 Account-hosted authorization attempt，且该 identity binding 仍然有效。这里的 fresh 指新 attempt 和新 provider credential。Adapter 仍应请求 provider 支持的最强 re-authentication 或 account selection 行为，但不要求 provider 一定重新采集密码。仅有数据库 identity 记录但 provider 当前不可用时，不向用户提供该 proof method。

同一 provider 可以用于 proof，但必须是已经绑定到 target user 的另一个 stable subject。Provider adapter 应在能力允许时请求 fresh authentication 或 account selection。对于 OIDC provider，可以按 provider 能力使用 `prompt=login`、`prompt=select_account` 或组合策略。该参数只能提高重新选择账号的确定性，不能被解释为 provider 一定重新采集了密码。

Provider credential handoff 可以产生本次流程的 pending provider identity，但不能充当 target user 的 proof。Purpose-specific provider proof 必须由 Account Web 从当前 interaction 启动，不能接受 app 声称已经完成的 target user 认证。

如果 target user 没有任何可用的已有登录方式，用户不能自助完成 link。Account recovery 或管理员协助属于独立设计，hosted interaction 不得降低 proof 要求作为兜底。

Existing-account-only proof 在认证成功前不得区分 username 不存在、用户没有 password credential、密码错误或 provider identity 未绑定等情况。对用户和调用方返回同一类有界认证失败，详细原因只进入受控安全事件。

### Proof 的流程

1. 用户在 `chooseResolution` 选择 link，或从 Add sign-in method flow 到达 proof step
2. 后端启动 existing-account-only authentication，并绑定 interaction、pending provider identity、purpose 和 expected step
3. 该 authentication 只能解析已有 Account user，不能创建用户、创建 identity、切换 Account session 或完成 OAuth authorization
4. 成功后，后端创建短生命周期 proof，记录 target user 和 proving credential 的内部 reference
5. Interaction 进入 `confirmLink`，Account Web 显示 target user 的 Account-owned `username`、`displayName`、`avatar`，以及 pending provider identity 的 provider 名称和有限展示信息
6. 用户明确确认 link
7. 后端原子消费 proof，重新检查 identity 归属和 target user，创建 binding，并完成 session、审计和 continuation

Proof 和 confirmation 必须分离。认证成功不能自动创建 binding，因为用户还需要确认自己认证的是预期 Account user，并理解将要新增的登录方式。

如果用户明确选择绑定到当前用户，interaction 在启动 proof 前把 proof 的 target user 固定为当时的 current Account session user。Proof 解析到其他 user 时必须失败，不能静默 retarget。如果用户选择绑定到其他已有用户，或开始时没有 current Account session，target user 由成功的 existing-account-only proof 确定。Add sign-in method 的 target user 始终是 initiating session user。

### Proof 的范围与失效

Proof 至少绑定：

- hosted interaction
- link purpose
- pending provider identity key
- target Account user
- proving credential 或 linked identity
- origin
- interaction 的 absolute expiry

Proof 只允许成功消费一次，且 expiry 不得晚于 interaction 的 absolute expiry。证明所使用的 password credential 被替换或清除、linked provider identity 被移除或改变归属、target user 不再有效时，proof 必须失效。

失败 proof 只消费当前 attempt。它不得清除原 Account session，也不得改变 interaction 已保存的 pending provider identity。

### 绑定完成

最终绑定事务必须重新检查：

- Interaction 仍处于 `active` 状态，当前 step 为 `confirmLink`，且 version 与提交匹配
- Proof 有效、未消费且属于当前 interaction 和 target user
- Pending provider identity 在数据库中仍不存在 binding，或已经由并发请求绑定到同一 target user
- Purpose 要求的 fixed target user 没有发生变化
- Proving credential 仍然属于 target user
- current Account session 与 interaction 记录的 session 前提没有发生未处理变化

如果 identity 已经由并发请求绑定到同一 target user，可以把 completion 视为幂等成功，并继续完成当前 interaction 对应的 session 与 continuation，但不得写第二条 `identity linked` 变更审计事件。如果它已经绑定到其他 user，interaction 必须进入 `invalidated`，不移动 identity、不覆盖 binding，也不合并用户。

## Account session 与账号选择

### Bound provider identity 与 current Account session 的冲突

当 provider identity 已绑定到 user B，而浏览器的 current Account session 属于不同的 user A 时，这是 account selection，不是 account linking。

OAuth 或普通 Account Web sign-in origin 应进入 `selectAccount`，提供：

- 继续使用 A
- 切换到 B
- 取消

Account Web 显示 A 和 B 的 account-owned `username`、`displayName`、`avatar` 以及 provider 名称，不显示内部 user ID、stable provider subject 或 provider credential。

选择 A 时，provider B 只对当前请求被忽略。A 的 session 保持不变，OAuth authorization 以 A 完成。选择 B 时，用户必须明确确认切换。后端只撤销当前浏览器中对应的 A session，创建 B 的新 session，并以 B 完成 OAuth authorization。A 和 B 的其他 session 不受影响。

选择 A 或 B 都不创建、删除或移动 `user_identity`。Provider credential 已经证明 B，因此 account selection 不要求 link purpose 的额外 proof，但切换浏览器中的 SSO user 仍要求明确 confirmation。

App、provider hint 或 PAR extension 不能替用户选择 A 或 B。用户启动另一个 provider attempt 时，后端也不得预先撤销 A 的 session。

Add sign-in method purpose 的 target user 已固定为 A。若新取得的 identity 已绑定到 B，不能显示 account selection，也不能让用户切换到 B 后继续该操作。本次 attempt 返回有界归属冲突，interaction 回到 `acquireIdentity`，且 UI 不暴露 B。

### Unbound provider identity 与 current Account session

当 pending provider identity 在数据库中仍不存在 binding，且 current Account session 属于 A 时，用户仍要明确选择：

- 绑定到 A，并对 A 完成 purpose-specific proof
- 绑定到其他已有 Account user，并对该用户完成 purpose-specific proof
- 创建新的 Account user
- 取消

选择绑定到其他用户或创建新用户后，A 的 session 在流程成功前保持有效。UI 必须在最终 confirmation 或 profile 提交前明确说明当前浏览器将切换到新的 effective user。只有 terminal completion 确定 effective user 后，后端才撤销当前浏览器的 A session 并创建 effective user 的新 session。取消、可恢复错误和 expiry 都不得主动撤销或替换原 A session。

### Account session 的结果

| 完成场景 | 当前浏览器 session 结果 |
| - | - |
| Hosted provider acquisition 直接解析到 B，且没有 current Account session | 创建 B session |
| Provider credential handoff 直接完成 OAuth，且没有 hosted interaction | 不创建 Account session |
| 没有 current Account session，通过 hosted interaction 创建或绑定到 effective user | 创建 effective user 的新 session |
| current Account session 已经属于 effective user，且没有敏感的登录方式添加操作 | 可以复用 current Account session |
| 把 identity 绑定到 current Account session user | 绑定成功后轮换当前浏览器的 session |
| current Account session A，绑定到 B | 绑定成功后撤销对应的 A session，并创建 B session |
| current Account session A，创建新 user C | 创建成功后撤销对应的 A session，并创建 C session |
| account selection 从 A 切换到 B | 确认成功后撤销对应的 A session，并创建 B session |
| 从 A 自助移除一个第三方登录方式 | 保留 A 的 current session 和其他 Account sessions，不轮换或撤销 session |
| 取消、可恢复错误或完成事务失败 | 不主动撤销原 session，也不创建替代 session |

Session 变更、identity 或 user 变更以及 interaction 的 terminal completion 必须由同一次权威完成操作原子提交。设置新 cookie 之前不得预先撤销 current Account session。

最终完成时必须重新读取 current Account session 和 identity 归属。如果页面展示后条件发生变化，后端不得沿用 stale choice。它应返回新的服务端 projection，或在安全前提不可恢复时将 interaction 标记为 `invalidated`。

Effective user、最终 Account session user 和 OAuth authorization code user 必须始终相同。

## Account Web 登录方式管理

Account Web 应提供当前用户的账号页面，用于：

- 查看当前 Account user 的第三方登录方式
- 添加新的第三方登录方式
- 移除符合条件的第三方登录方式

### 查看登录方式

UI 按 identity binding 逐条展示，而不是把 provider 简化为一个布尔值。当前数据模型允许同一 Account user 绑定同一 provider 的多个 stable subject，hosted interaction 不应在没有专项决定的情况下增加“每个 provider 最多一个 identity”的限制。

每个 identity item 可以显示 provider、provider-owned display metadata、绑定时间和 Account-owned 安全说明。UI 不应显示原始 stable subject。缺少 provider display metadata 时，应使用 provider 名称和绑定时间区分，而不是暴露内部 ID。

### 添加登录方式

1. 用户在有效 Account session A 中选择 Add sign-in method
2. 后端创建 purpose 为 Add sign-in method、fixed target user 为 A、绑定 initiating session 的 hosted interaction
3. 用户选择 provider，后端从 interaction 启动 provider attempt
4. Provider callback 验证 identity，并重新读取 binding 归属
5. unbound provider identity 进入 A 的 proof 和 confirmation
6. 已绑定到 A 的 identity 以“已绑定”结果完成 interaction，不重复创建 binding，也不写变更审计事件
7. 已绑定到 B 的 identity 报告有界归属冲突，并返回 `acquireIdentity` 供用户选择其他 provider，不切换 session、不 retarget、不移动 binding，也不暴露 B
8. 绑定成功后轮换 A 在当前浏览器中的 session，并返回 Account Web identity list

用户从 provider 页面取消，只取消该 provider attempt。Interaction 可以继续保持 `active`，让用户 retry、选择其他 provider 或明确取消整个 Add sign-in method 操作。

### 移除登录方式

用户只能自助移除第三方 identity binding。管理员托管密码不由用户添加或删除，也不计入用户可管理的登录方式数量。只有一个第三方 identity 的用户不能自助移除它，无论该用户是否另有管理员托管密码。只有管理员托管密码、没有第三方 identity 的用户只能添加登录方式。

移除登录方式使用与绑定已有账号相同的 existing-account-only proof 方法。管理员托管密码或属于 target user 的 bound provider identity 都可以证明账号控制权，fixed target identity 本身也可以在删除前用于 proof。Account session 本身无论建立时间或登录方式都不能替代本次 purpose-specific proof。剩余数量始终只按有效第三方 identity bindings 计算，与用户选择哪种 proof 方法无关。密码即使用于 proof 也不计入，成功 proof 也不替代最终事务中的数量检查。

流程如下：

1. 用户在有效 Account session A 中选择属于 A 的 identity X
2. 后端创建 purpose 为 Remove sign-in method、fixed target user 为 A、fixed target identity 为 X，并绑定 initiating session 的 hosted interaction
3. 用户使用 A 的一种可用 existing-account-only proof 方法完成 purpose-specific proof
4. Interaction 进入 `confirmUnlink`，Account Web 显示将被移除的 X 和移除后仍保留的第三方登录方式
5. 用户明确确认 unlink
6. 后端在同一事务中重新检查 interaction、initiating session、X 的归属和 proof，锁定 A 的用户记录作为该用户所有登录方式变更的串行化点，重新读取 identity bindings，确认移除 X 后仍至少保留一个用户可管理的登录方式，再删除 X 并写入必需的审计记录
7. Interaction 进入 `completed`，effective user 保持为 A，并返回 Account Web identity list

Unlink proof 至少绑定 interaction、Remove sign-in method purpose、fixed target user A、fixed target identity X、proving credential 的内部 reference、origin 和 absolute expiry。Proof 只能消费一次。X 的归属改变或已经被移除，证明所使用的 password credential 被替换或清除、provider identity 被移除或改变归属，或者 target user 不再有效时，proof 必须失效。

如果只有 proof 过期或 proving credential 失效，而 X 仍属于 A 且 A 仍有其他用户可管理的登录方式，后端清除旧 proof 和 confirmation，并把 interaction 返回 `proveAccountControl`。如果 X 的归属或最后一个用户可管理登录方式的约束已经不再满足，则该操作不能通过重新 proof 恢复。用户后续添加其他登录方式后，需要重新发起 Remove sign-in method interaction。

最终事务发现 X 已经不存在、不再属于 A，或移除 X 会使用户可管理的登录方式数量变为零时，不得删除任何 identity，也不得写入 identity removal 审计事件。Interaction 进入 `invalidated`，Account Web 使用稳定原因类别说明操作未完成并刷新 identity list。对同一个已经 `completed` 的 interaction 重复提交，只返回既有 terminal result，不再次执行这些检查或变更。

UI 可以在用户只有一个第三方 identity 时隐藏或禁用 remove action，但最终约束必须由后端事务保证。两个 interaction 并发移除同一个 X 时，只有一个可以删除 binding，另一个在重新检查 X 时进入 `invalidated`。若 A 恰好有两个第三方 identities，两个并发 interaction 分别尝试移除其中一个，则最多一个能够成功。后提交的 interaction 必须在取得该用户的串行化锁后看到只剩一个用户可管理的登录方式并进入 `invalidated`，不能让两个删除都提交。

Unlink 只改变未来可用于登录的 provider identities。当前 [`AccountUserSession`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/model/account_user_session.go#L8-L34) 和 [`AccountAppGrant`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/model/account_app_grant.go#L5-L25) 直接绑定 `user.id`，[`AccountAppToken`](https://github.com/goplus/builder-backend/blob/35b5c4d594f4ee4d7c7293142bd6e5ae44eae2e0/internal/model/account_app_token.go#L9-L47) 则通过 grant 归属于用户，都不依赖建立它们时使用的 `user_identity`。因此成功 unlink 不轮换或撤销任何 Account session，不撤销 OAuth grant 或 token，也不影响 app-owned session。用户需要处理可疑登录时，应使用独立的 session management 能力。X 被移除后再次用于登录时，按 unbound provider identity 进入 create-or-link interaction。

## OAuth continuation 与错误

### 建立 trusted continuation

OAuth origin 只有在 app、redirect URI、PAR、PKCE parameters、scope 和 `request_uri` 已经验证后，才可以创建 hosted sign-in context 或 hosted interaction。服务端保存的 PAR 决定 trusted app callback，浏览器不能提交或覆盖。

无效 client、未通过 allowlist 的 redirect URI、无法验证或从未被 interaction claim 的 `request_uri` 都不得重定向到浏览器提供的 callback。此类错误停留在 OAuth endpoint response 或 Account-owned error surface。

### 可恢复错误与 terminal result

以下错误留在 Account Web。有 interaction 时保持 interaction 为 `active`，尚处于普通 sign-in context 时则保持该 context 可继续：

- profile 字段校验失败
- `username` 冲突
- proof of control 失败
- provider attempt 取消
- 可恢复的 provider failure
- stale step 或 stale version 提交
- 临时 avatar import 失败

可恢复错误可以创建新的 attempt 或重新提交当前 step，但不能延长 interaction 的 absolute expiry。

OAuth-originated interaction 的 terminal result 使用以下 authorization response：

| terminal result | app callback |
| - | - |
| 成功 | `code` 和原始 app `state` |
| 用户明确取消 interaction | `error=access_denied` 和原始 app `state` |
| Account policy 或安全决策拒绝 authorization | `error=access_denied` 和原始 app `state` |
| Interaction 在已有 trusted continuation 时过期 | `error=invalid_request` 和原始 app `state` |
| 临时服务故障导致无法继续 | `error=temporarily_unavailable` 和原始 app `state` |
| 建立 trusted continuation 后发生不可恢复的内部错误 | `error=server_error` 和原始 app `state` |
| 无法建立 trusted continuation | 不回调 app，停留在 Account-owned error surface |

Callback 必须恰好表达一个结果。成功响应只有 `code`，错误响应只有 `error`。两者都返回 PAR 中原始 app `state`。Provider state、interaction handle、proof handle 和 PAR handle 都不能替代 app state。

Provider 返回的 `error=access_denied` 只表示本次 upstream provider attempt 没有取得 credential。它不等于用户拒绝 downstream XBuilder app authorization。Account Web 可以允许 retry、选择其他登录方式或明确取消 interaction。只有最后一种行为才向 app 返回 OAuth `access_denied`。

Provider error code、provider response text、内部原因、identity 冲突细节和 proof result 不得复制到 app callback。`error_description` 如需返回，应是稳定、通用且不含敏感信息的面向开发者文本。

XBuilder Account 只使用 OAuth 2.0 authorization error semantics。除非将来实现对应 OpenID Connect request 和 `prompt` 语义，否则不因为 Account Web 出现交互就返回 `interaction_required`、`login_required` 或 `account_selection_required`。

Account Web local origin 没有 app callback。成功、取消、过期和错误都回到服务端固定的 Account Web 目标。

### 恰好一次完成

Interaction 的 terminal completion 必须只提交一次。成功完成时，需要在同一个事务中原子确定 effective user，并完成适用的 user 或 identity 变更、用于产生必需审计事件的持久记录、session 变更、PAR consumption 和 authorization code creation。

OAuth-originated flow 的最终提交应作为 Account-owned endpoint 上的 top-level POST 完成。后端在事务成功后直接以 `303` 跳转到 trusted app callback，使原始 authorization code 只出现在 authorization response 的 `Location` 中，不进入 interaction projection 或普通 JSON response。Account Web 可以在最终 POST 前通过同源 API 保存和校验 draft，但最终 POST 仍要重新检查全部约束。可恢复冲突则保留处于 `active` 状态的 interaction，并 `303` 返回对应 Account Web route。

OAuth-originated cancel、expiry 和其他 terminal error 也必须先在事务中提交 terminal status，并消费或永久关闭被 claim 的 PAR，再向 trusted app callback 发送错误响应。Callback delivery 只是已提交结果的传递，不是另一次 transition。

重复 confirmation、并发请求、reload 或迟到 callback 可以读取处于 terminal status 的 projection，但不能重复创建用户或 binding、移除 identity、创建 session、写入审计事件或签发 authorization code。Authorization code 的原始值不为 reload 持久化。若成功 callback delivery 丢失，app 重新发起 OAuth authorization，而不是让旧 interaction 签发第二个 code。

XBuilder 和其他 app 的 OAuth callback handler 必须同时支持成功与错误响应，对两种响应都验证 `state`。错误响应不执行 token exchange，并清理对应的 pending PKCE authorization state。

## API 边界

最终 HTTP 契约由 OpenAPI 定义。本文不锁定 path 命名，但 Account API 至少需要以下独立能力：

- 创建或恢复 OAuth sign-in context 与 Account Web local sign-in context
- 根据 sign-in context 或 interaction 返回当前 purpose 允许的 provider 列表，不要求 Account Web local flow 伪造 `clientID` 或 `requestURI`
- 根据 opaque handle 读取当前 hosted interaction projection
- 对 unbound provider identity 选择 create、link 或 cancel
- 校验并提交 profile completion
- 保存 non-authoritative profile draft，并通过 top-level POST 提交最终 confirmation
- 查询 advisory username availability
- 启动绑定到 interaction 和 purpose 的 provider attempt
- 提交 existing-account-only password proof
- 启动 existing-account-only provider proof
- 确认 identity link
- 提交 account selection
- 取消整个 interaction
- 从 current Account session 创建 Add sign-in method interaction
- 从 current Account session 和当前用户拥有的 identity 创建 Remove sign-in method interaction
- 查看当前用户的 identity binding 明细
- 确认移除 fixed target identity

创建 Remove sign-in method interaction 时，浏览器可以提交从当前用户 identity list 选择的 identity reference。后端必须在 initiating session user 的有效 bindings 中重新解析并校验该 reference，再把对应内部 identity reference 固定到 interaction。浏览器不能提交 target user ID、provider subject 或其他身份归属事实。

Provider authorize 和 callback endpoints 可以沿用 provider adapter boundary，但必须能够区分普通 sign-in context、Add sign-in method attempt 和 proof attempt。Callback 只消费对应 attempt state，并把 verified result 交给所属 context 或 interaction，不自行决定创建用户或绑定 identity。

### Interaction projection 的边界

Account Web 读取的是由后端根据 interaction 计算的 projection，而不是数据库 payload。Projection 可以包含：

- status、step、expiry 和 version
- origin 的安全展示信息，例如 app display name 或 Account Web operation name
- 允许的动作
- pending provider identity 的 provider 名称与有限展示信息
- Remove sign-in method 的 fixed target identity 有限展示信息
- current Account session user 的 Account-owned summary
- proof 成功后的 target user summary
- profile suggestions 和用户已经保存的 draft
- 可恢复错误的有界错误码

Projection 不得包含 stable provider subject、内部 target user ID、PAR payload、redirect URI、app state、provider state、proof handle、session token 或其他 credential。

变更请求只提交当前 step 允许的动作、用户可编辑字段和 projection version。Target user 由 proof 或 purpose 已确定的 fixed target user 决定，不能由浏览器提交 ID。出现 stale version 时应返回当前 projection 或稳定冲突错误码，让 UI 刷新状态，不能覆盖较新的选择。

### API 认证与 CSRF

读取 interaction 同时要求 opaque interaction handle 和匹配的 browser continuity。使用 cookie 认证的变更请求还必须校验 `Origin` 或使用等价 CSRF token。Provider callback 使用其单次 provider state 防护，不套用普通 same-origin CSRF token。

Account session、OAuth access token 和 interaction handle 的权限不可互换：

- Account session 可以发起 Add 或 Remove sign-in method interaction，但不能单独完成 link 或 unlink
- App OAuth access token 不授权 username、identity 或 session management
- Interaction handle 只能访问对应 interaction 的有限 projection 和动作
- Browser continuity 不能访问其他 Account resources

Profile completion 中设置初始 `username` 是 interaction-scoped user creation 操作，不扩展 `account:user:write`。Account Web 的 identity list 只由 Account session 授权，Add sign-in method 和 Remove sign-in method 还要求 purpose-specific proof，三者都不能由 app OAuth scope 授权。

Account Web 登录方式管理的 completion 必须校验 initiating session 仍属于 fixed target user，且当前浏览器没有切换到其他 Account user。如果 session 已经切换，interaction 必须进入 `invalidated`，并要求从 Account settings 重新开始，不能用旧 interaction 修改新 session 所属账号的登录方式。

## Account Web 交互

Account Web 至少需要以下 route 级页面：

- Sign-in：承载普通 OAuth 或 local sign-in context，选择 current Account session、provider 或管理员托管密码
- Hosted interaction：只携带 opaque interaction handle，并按 projection 渲染 create-or-link、profile、proof、link 或 unlink confirmation，以及 account selection
- Account settings：显示 Account-owned profile 和 sign-in method 明细，并发起 Add 或 Remove sign-in method interaction
- Local result：显示 Account Web operation 的成功、取消、过期或重新开始结果
- Account-owned error：处理无法建立 trusted continuation 的请求

Route query 不能决定 step。页面重新加载时重新读取 projection。浏览器后退可以回到历史页面，但 stale form 提交由 version 和服务端状态拒绝，不能让 interaction 倒退。UI 应允许用户返回到仍合法的选择 step，但该操作必须是由服务端执行的显式 transition，而不是只修改前端 route。

Account Web 显示账号时使用 `username`、`displayName`、`avatar` 和 provider display name。内部 user ID、stable provider subject、proof category 细节和安全原因不属于用户界面。

`ui_locales` 或 Account Web 本地语言选择只影响界面语言。Interaction 可以保存已协商 locale 供 reload 使用，但 locale 不参与 authentication、identity 归属、proof 或 authorization decision。

Native app 继续通过系统浏览器或系统认证会话打开 hosted interaction。受限 runtime 的 provider credential handoff 在需要用户决策时也必须打开 Account Web，不能因为 handoff 发生在 app 内而自动创建账号。

## 持久化、并发与过期

### 事务与锁

每次 transition 都必须在事务中读取并锁定 interaction，检查 status、step、version、expiry 和相关 interaction attempt。执行 terminal completion 时，还需要锁定或以唯一约束保护 pending provider identity、target user、current Account session、PAR 和 proof。

数据库中有效的 `user_identity` 具有 provider、subject namespace、subject 唯一约束，该约束是 identity 归属的最终权威依据。应用层 availability check 不能替代它。

Interaction 进入 terminal status 的 transition 与用于产生必需审计事件的持久记录必须原子持久化。该记录可以是最终持久审计事件，也可以是同一事务中的 transactional outbox record。不得先向用户报告成功，再以 best-effort 方式补写必需的审计事件。

### 并发规则

- 同一 PAR 只能被一个 interaction claim
- 同一 interaction 同一 version 只能有一个 transition 成功
- 同一 proof 只能被一个 completion 消费
- 同一 provider identity 并发绑定到同一 target user 可以幂等成功
- 同一 provider identity 并发绑定到不同 target user 必须让后提交者因归属冲突而失败
- 同一用户的并发 unlink 必须串行检查最终剩余的用户可管理登录方式，任何提交都不能使其数量变为零
- `username` 并发冲突回到 profile step，不自动改名或关联已有用户
- 取消与 completion 并发时，只有一个进入 terminal status 的 transition 成功
- Interaction 进入 terminal status 后，provider callback、proof callback 和 form submission 都是 stale，不改变结果

### 过期规则

Interaction 使用创建时确定的 absolute expiry。未被 claim 的 `request_uri` 在 PAR expiry 后不能再创建 interaction。已经在有效期内被 interaction 原子 claim 的 authorization request 可以继续到该 interaction 的 absolute expiry，因为 trusted continuation 已经成为 interaction 的不可变 origin。原 `request_uri` deadline 不能再被其他流程利用，也不能因 reload 或 retry 重新计时。

Provider attempt 和 proof attempt 分别使用独立的短期 expiry，且都不得晚于 interaction 的 absolute expiry。Retry 产生新的 attempt expiry，但不移动 interaction 的 absolute expiry。Interaction 到期后，用户需要从 app 或 Account Web operation 重新开始。具体时长由服务端安全配置统一管理，不属于浏览器或 API 输入。调整时必须同时评估正常完成时间和 credential replay 窗口，并由后端测试覆盖这里定义的相对过期约束。

普通清理任务可以异步删除已经超过保留窗口且处于 terminal status 的 interaction 和 attempt artifacts，但过期判定不能依赖清理任务是否已经执行。

Interaction 进入 terminal status 后应执行数据最小化。完成幂等结果读取和 callback delivery 所需的状态可以保留到短期保留窗口，但不再需要的 pending provider identity 的 stable subject、provider profile snapshot、profile draft 和临时 avatar reference 应尽快清除。长期调查处于 terminal status 的 interaction 时，应使用内部 user、identity、session、事件和 correlation reference，不依赖保留 unbound provider identity 的 profile。

## 安全边界

### 身份与绑定

- 只按 stable provider identity key 查找 binding
- 不按 email、username、display name、avatar 或 provider profile 相似度自动绑定
- 不在认证前暴露已有 Account user 是否存在或建议具体账号
- 绑定必须具有 purpose-specific proof 和显式 confirmation
- 自助 unlink 必须完成 purpose-specific proof，并在串行化的最终事务中保证不会移除最后一个用户可管理的登录方式
- 操作不得改变 purpose 已确定的 fixed target user
- 已绑定到其他 user 的 identity 不允许移动、覆盖或合并

### OAuth 与浏览器

- App redirect URI 继续使用精确 allowlist 校验
- OAuth authorization code 继续绑定 app、redirect URI 和 PKCE
- App state、provider state、PAR、interaction handle 和 proof handle 具有独立 trust boundary
- 敏感 Account Web 页面使用 CSP `frame-ancestors 'none'`，禁止被其他页面嵌入
- Hosted interaction HTML、projection 和变更响应使用 `Cache-Control: no-store`
- Account Web 不把 credential、handle 或 callback state 发送到 analytics、error reporting 或第三方资源
- 所有展示用 provider metadata 都按不可信输入转义和限制长度

### 滥用控制

以下入口需要分别限流和安全监控：

- Password proof 按 username、IP 和 interaction correlation 限制
- Provider attempt 按 provider、browser continuity 和 interaction 限制
- Username availability 按 browser continuity 和 IP 限制
- Interaction creation 和 retry 按 app、session、browser continuity 与 IP 限制
- Replay、purpose mismatch、origin mismatch、尝试改变 fixed target user 和乱序动作都作为安全信号

限流失败不得把 identity 绑定到错误用户。安全监控不可用也不得把原本应拒绝的请求放行。

## 审计、安全事件与诊断

Hosted interaction 产生三类不同输出：

| 类别 | 用途 |
| - | - |
| 持久审计事件 | 长期归因账号、登录方式和当前浏览器账号切换等安全相关变更及其 terminal result |
| 安全监控事件 | 检测 proof 失败、replay、归属冲突、非法改变目标用户和流程完整性问题 |
| 运维诊断 | Provider 故障、callback 传输、延迟、清理和服务错误排障 |

现有 `admin_audit_log` 假设 actor 是已认证管理员、只包含一个 resource，且 resource ID 为正数，无法充分表达 hosted interaction。设计上应建立 Account user 安全事件的逻辑模型，不把匿名开始、多参与方的流程伪装成管理员操作。物理上可以使用独立表或持久事件管道，并由管理工具统一查询，但事件语义必须与管理员变更分开。

### 必需的持久审计事件

至少对以下成功结果写入持久审计事件：

- 创建新 Account user 和初始 provider identity
- 把 unbound provider identity 绑定到已有 Account user
- 从 Account user 移除一个第三方 identity
- 显式 account selection 导致当前浏览器的 session 从 user A 切换到 user B

Purpose-specific proof 的成功与失败属于安全事件边界。最终 binding 或 unlink 事件必须能归因到授权它的 proof，但不能记录认证 credential。Binding 事件还应记录由 completion 导致的 session rotation。仅为防止 session fixation 而轮换同一用户的 session，不需要成为独立的持久审计事件。

### 参与方角色

事件模型不能只提供一个含义模糊的 actor。它应按事件中实际存在的参与方，区分匿名浏览器、current Account session user、provider-resolved user、fixed 或已证明控制的 target user、effective user、受影响的 identity、OAuth app 或 Account Web local operation，以及 Account policy 决策。Effective user 可以在语义准确时作为变更 actor，但之前的 session user、target user 和受影响的 identity 仍是独立 subjects。

### 事件数据策略

可以记录有界事件类别、结果、原因类别、origin、app ID、provider、内部 user ID、identity ID、session record ID 和不可重放的内部 correlation ID。

不得记录：

- 密码或 password 派生值
- Provider authorization code、access token、refresh token、ID token 或 credential
- OAuth authorization code、access token、refresh token、session token 或 app secret
- 原始 provider response 或完整 profile payload
- App OAuth `state`、PAR handle、provider state、proof handle、interaction handle 或 browser continuity value
- avatar 内容或临时对象位置
- 未过滤的 provider error 或内部异常文本

Unbound provider identity 的安全关联应使用受保护的内部 correlation value，不把原始 stable provider subject 写入普通审计 metadata。事件字段使用 allowlist，而不是先接受任意 metadata 再依赖 key-name filter 排除 secret。

无法持久化必需的审计事件或其可靠投递记录时，敏感 completion 不得报告成功。被拒绝的认证在安全监控存储失败时仍保持拒绝，日志故障绝不能变成授权成功。

每个需要持久审计的 interaction 只有一个记录 terminal result 的审计事件。每次 retryable attempt 都可以产生独立安全事件，因为每次 attempt 都是不同的安全观察。普通 profile 校验、`username` 冲突、后退导航、无害的 stale submit、取消 provider attempt、expiry 和 provider 故障默认只进入指标或运维诊断，不污染持久审计。

IP 地址和 User-Agent 是个人数据和弱信号，不是 identity proof。它们的采集、访问和保留期限必须由明确策略控制。

## 首期交付范围

首期交付范围必须形成一个完整的安全闭环，包含：

- 普通 OAuth 和 Account Web local sign-in context
- 拆分 verified identity lookup 与 user creation
- unbound provider identity 必经 create-or-link interaction
- `username`、`displayName` 和 avatar suggestion 的 profile completion
- 使用已有 bound provider identity 或管理员托管密码完成 purpose-specific proof
- link 与 unlink confirmation、identity 归属检查和最后一个用户可管理登录方式的并发约束
- current Account session A 与 bound provider identity B 的 account selection
- Account Web 查看、添加和移除 sign-in methods
- Hosted interaction、interaction attempt、browser continuity、expiry、replay 和乐观并发控制
- OAuth 成功、取消、错误 callback 与 app 端错误处理
- 必需的持久审计和安全事件边界

下列能力不在首期交付范围内：

- Account recovery
- profile completion 中的自定义 avatar staged upload
- 用户可见的 Account activity history
- 风险评分、设备信任或 MFA policy orchestration
- 合并已有用户或覆盖 provider identity 归属

现有管理员移除 identity 的能力保持独立。管理员特权操作仍可以让账号失去所有第三方 identities，必要时由管理员托管密码或人工支持恢复访问，不受用户自助 unlink 的剩余登录方式约束，但仍须与用户自助添加和移除登录方式共享同一个用户级串行化点。

如果 Account Web 或 hosted interaction 后端暂时不可用，unbound provider identity flow 应失败并允许稍后重新开始，不得恢复旧的 silent auto-create 行为作为兜底。

## 兼容性

已有 `user_identity` 继续视为 bound provider identity，受支持的 legacy mapping 仍可以在 lookup 阶段解析到已有用户。新的 create-or-link 策略只改变未来 unbound provider identity 的处理方式，新的登录方式管理能力只在用户完成明确的 add 或 unlink interaction 后改变 binding。系统不迁移现有 binding，不追溯识别重复用户，也不自动修复、合并或重新分配历史账号。

## 参考资料

- [XBuilder Account 文档](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/docs/product/account.zh.md)
- [Research XBuilder Account hosted interaction flows (#3336)](https://github.com/goplus/builder/issues/3336)
- [XBuilder OpenAPI](https://github.com/goplus/builder/blob/5ff48e65d27b4ee3c8111f1f4de03cf9265b203e/docs/openapi.yaml)
- [RFC 6749: The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 9126: OAuth 2.0 Pushed Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9126)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [NIST SP 800-63B: Authenticator event management](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- [Keycloak Server Administration Guide: identity brokering and first login flow](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker_first_login)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
