# XBuilder Account 自有 app 登记与接入

XBuilder Account 统一登记自有 app，提供稳定的 app 标识、用户身份接入和受限的资料读取能力。自有 app 可以通过用户授权读取该用户的账号资料，也可以在获得平台批准后，以 app 身份读取必要资料。

本文档定义自有 app、OAuth client 和 Account API 访问授权的产品与系统边界。用户登录方式、第三方身份、account session 和账号管理行为见 [XBuilder Account](account.zh.md)。自有 app 登记、OAuth client 和访问授权的边界以本文档为准，具体数据库 schema 和完整 OpenAPI 契约由实现设计及 `docs/openapi.yaml` 定义。

## 背景与目标

XBuilder、X3D、订单系统和 XBuilder Pay 等自有 app 需要共享稳定的账号与 app 身份。它们各自拥有业务资源、调用凭证和权限规则，并在用户访问、后台任务和管理操作中使用 Account 提供的身份能力。

用户查看本人资料、订单后台查看购买者资料，以及共享服务查询 app 目录，使用不同的授权依据。后台执行也可能沿用有效的用户授权，或使用 app 自身的权限。访问方式由授权来源确定，不以用户此刻是否在线区分。

目标包括：

- 使用稳定的 `app.id` 标识自有 app，并供共享服务引用
- 为同一 app 支持不同接入环境的 OAuth clients
- 支持用户委托访问与 app 自主访问，并分别管理授权
- 提供受限的 app 目录和用户资料读取能力
- 明确 Account、接入 app 和业务服务各自的权限责任
- 保留身份登记、授权、凭证和资料访问的审计关联

非目标包括：

- 任意第三方 app 自助注册或公开开发者平台
- 集中管理各业务的商家、工作区、订单、支付或产品权限
- 替代订单、支付等业务服务的接入凭证与权限规则
- 以机器身份模拟用户登录
- 通用 token exchange、跨业务服务的用户令牌转发或任意资源授权
- 跨部署环境合并 app、账号或授权

## 核心概念

| 概念 | 含义 |
| - | - |
| `user` | XBuilder Account 账号主体，以稳定的 `user.id` 引用 |
| `app` | 平台登记和管理的自有 app，以稳定的 `app.id` 引用 |
| `oauth_client` | 某个 app 的具体 OAuth 接入配置，定义客户端类型、授权方式、回调、凭证和自主访问权限 |
| `app_grant` | 某个用户授权某个 app 访问 Account 用户能力的记录 |
| User access token | Account 根据用户授权签发的访问令牌，关联用户、app 和 OAuth client |
| App-only access token | Account 根据 app 自主访问权限签发的访问令牌，代表 app 并绑定具体 OAuth client |

一个 app 可以登记零个、一个或多个 OAuth clients。自有 app 的登记不自动产生用户授权、app 自主访问权限或其他系统的接入资格。

## 系统边界

| 能力或资料 | 负责系统 |
| - | - |
| 用户账号、昵称、头像和账号登录 | XBuilder Account |
| 自有 app 登记、基础展示资料和 OAuth clients | XBuilder Account |
| 用户委托访问与 app 自主访问 Account API 的授权 | XBuilder Account |
| Account 管理员角色的授予和判定 | XBuilder Authorization |
| 订单、商家范围、审批和履约权限 | 订单系统或对应业务系统 |
| 支付、退款、来源授权和支付管理权限 | XBuilder Pay |
| 接入其他业务服务的凭证和操作范围 | 对应业务服务 |

`/account/*` 表示 Account 拥有的接口职责。调用身份和访问范围由各接口契约限定。Account Web 使用 account session，用户委托访问使用用户访问令牌，app 自主访问使用 app 自主访问令牌。

自有 app 的前端访问自己的后端。后端根据所需能力直接调用 Account API，并按自己的业务权限向前端返回必要资料。账号身份与 app 标识可以沿可信业务调用链传递，访问权限由接收方分别校验。

## 自有 app 登记

一个 app 对应具有独立业务责任和接入身份的产品或服务，例如 XBuilder、订单系统和 Pay。同一 app 的 Web、手机端和后台任务可以共用 app 身份，通过不同的 OAuth clients 或业务服务凭证接入。

App 登记由平台通过管理台或受控运维流程完成。登记资料包括：

| 字段 | 含义 |
| - | - |
| `id` | 稳定的 app 标识 |
| `name` | 唯一的管理名称 |
| `displayName` | 面向用户展示的名称，创建时省略则使用 `name` |
| `avatar` | 可选的 app 图标，以可展示的 HTTP URL 返回 |
| `description` | 可选的简短说明 |
| `status` | Account 中的 app 状态，取值为 `active` 或 `disabled` |
| `createdAt`、`updatedAt` | 登记创建与更新时间 |

App 的 `id` 和 `name` 在创建后保持不变。展示名称、图标和说明可以更新。业务系统使用 `app.id` 建立关联，不能依赖展示名称、域名或 OAuth client 标识匹配同一个 app。

App 不提供删除语义，停用后仍保留身份、历史授权和审计关联。既有 ID 不得分配给另一个 app。

中国大陆与海外分别使用对应 Account 部署中的 app 和用户登记。相同的文本 ID 或名称不表示跨环境身份相同，接入地址、凭证和授权范围必须与部署环境一致。

## OAuth clients

OAuth client 绑定唯一的 `appID`，绑定关系在创建后保持不变。客户端类型、授权方式、回调配置和 secret 属于该 client，不属于 app 的公共登记资料。

同一 app 可以按运行环境和接入用途分别登记 OAuth clients。客户端的数量和配置不改变 app 的稳定身份。多组件 app 与客户端配置的关系可参考 [Google cross-client identity](https://developers.google.com/identity/protocols/oauth2/cross-client-identity)。

| 接入用途 | 客户端要求 |
| - | - |
| 用户交互式授权 | 使用 authorization code flow，按运行环境登记 public 或 confidential client，使用 PKCE 并配置 redirect URI allowlist |
| 后端代表用户延续访问 | 使用原用户授权对应的 refresh token，保持用户、app 和 client 绑定 |
| App 自主访问 | 使用 confidential client，明确允许 `client_credentials`，并具有平台批准的自主访问权限 |

交互式接入与 app 自主访问分别登记 client，以便独立管理凭证、权限和停用。只有启用 authorization code flow 的 client 才需要配置相应的 redirect URI，并按 Account 的登录契约校验回调、PKCE 和 OAuth state。

OAuth client 的 `id` 用于管理资源和内部关联，管理 API 中的 `oauthClientID` 引用该标识。对外的 `clientID` 由 Account 分配，创建后保持不变。新建 client 使用独立生成的随机字符串。

OAuth 协议中的 `client_id` 和 Hosted sign-in 中的 `clientID` 使用同一个对外标识。Account 根据该标识定位 OAuth client，再根据其 `appID` 取得 app 登记和展示资料。调用方不能将 `client_id` 当作 `app.id` 使用。

PAR 创建的 `request_uri`、授权码、redirect URI 和 PKCE 参数必须绑定同一个 OAuth client。授权流程不能在同一 app 的不同 clients 之间切换。

Confidential client 使用 `client_secret_basic` 认证，用户名为对外的 `clientID`，密码为 secret。Secret value 只在创建时返回，服务端保存哈希，并支持轮换重叠期和立即撤销。Public client 不持有 secret，不能获取 app 自主访问令牌。

Token introspection 遵循 [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html#section-2.2)，返回有效令牌所绑定的 `client_id`。Account 认证请求方的 confidential client，并只允许检查同一 app 下的令牌。

有效 access token 的 introspection 结果包含 `token_type`，取值为 `Bearer`。Refresh token 的结果不包含该字段。使用 introspection 校验 API 凭证时，必须检查 `active`、`token_type`、主体、client 绑定和使用范围，不能仅凭 `active` 或请求中的 `token_type_hint` 放行。

## Account API scopes

Account API 按令牌主体、对应授权和 scope 限定访问范围，返回字段由接口契约确定。用户委托访问与 app 自主访问的授权分别管理。

| Scope | 用户委托访问 | App 自主访问 |
| - | - | - |
| `account:app:read` | 不支持 | 读取当前 Account 部署中的自有 app 基础登记资料 |
| `account:user:read` | 读取令牌对应用户的 Account 资料 | 按用户 ID 读取当前 Account 部署中任意用户的 Account 资料 |
| `account:user:write` | 更新令牌对应用户允许修改的昵称和头像 | 不支持 |

## 用户委托访问

用户委托访问使用用户授予 app 的 Account 权限。`app_grant` 关联用户与 app，签发的授权码、访问令牌和 refresh token 同时绑定具体 OAuth client。

同一 app 的可信 clients 可以关联同一个 `app_grant`，但授权码和 refresh token 只能由原 client 按协议消费。共用 app 登记或已有 `app_grant` 不能直接取得某个用户的令牌，也不授予 app 自主访问权限。

`app_grant` 保存该用户向该 app 批准的 scope 集合，新增 scope 需要取得相应用户授权。某个 client 请求较小范围，不自动收紧已有授权或撤销其他 clients 的有效令牌。

OAuth 流程每次签发的令牌只包含本次请求中已获用户授权的 scopes，不自动带入 `app_grant` 的全部范围。Refresh token 的 scope 不因该 app 新增用户授权而扩大。

`GET /account/user` 从有效的用户 access token 确定当前用户。令牌授予本人资料读取权限，不授权通过请求参数选择另一名用户，也不授予用户列表、密码、身份绑定或账号会话的管理权限。

用户委托访问可以发生在用户离线期间。App 后端持有有效授权和 refresh token 时，可以按原授权延续访问。授权撤销或 refresh token 无法恢复后，需要重新取得授权。

管理员为有效的 `app_grant` 创建访问令牌时，必须显式指定该 app 下已启用用户授权的有效 `oauthClientID`。令牌绑定该 client，scope 继承用户授权，不签发 refresh token。令牌管理接口返回其 `oauthClientID`，用于校验、审计和按 client 停用。

自有 app 的产品 API 可以使用 [Account-issued token model 或 App-owned session model](account.zh.md#自有-app)。使用 Account-issued token model 时，后端只接受有效的用户 access token，并校验令牌属于本 app 认可的 OAuth client，从受信配置确定该 client 与本 app 的关系。产品权限继续由对应业务系统判定。

使用 App-owned session model 时，后端保存用户的 Account 授权和令牌，并维护自己的 session。前端只持有 app 自己的会话凭证。后端按需向 Account 读取资料，读取失败不自动表示 app session 已被撤销。

## App 自主访问

App 自主访问使用平台批准的权限，以 app 自身身份访问 Account API，不依赖购买者或管理员的用户令牌。后台任务、资料查询和身份校验可以使用这种访问方式。用户委托与 app 自主访问的区分可参考 [Microsoft permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)。

### 权限配置

OAuth client 的 `clientCredentialsScopes` 保存该 client 获准通过 `client_credentials` 请求的 Account API scope 集合，只能包含 app 自主访问支持的 scopes。该字段使用不重复的字符串数组，默认 `[]`。只有允许 `client_credentials` 的 confidential client 可以配置非空集合。空集合表示该 client 不能获取 app 自主访问令牌。

配置通过 OAuth client 的创建、查询和更新接口管理，由具备 `accountAdmin` 的管理员或受控运维流程按实际用途批准，并记录变更前后的 scope 集合、操作者和原因。

按用户 ID 读取用户资料，需要平台明确批准 `account:user:read`，不要求目标用户先向该 app 建立 `app_grant`。Account 检查调用 client、所属 app 和获准的 scopes，不将业务订单、商家或工作区关系同步为 Account 权限。业务系统必须继续校验当前操作者对业务资源的访问权，并限定实际查询和展示的用户。

例如，订单系统的 app ID 为 `20`，OAuth client 的资源 ID 为 `201`，对外的 `clientID` 为 `K7mR2qV9sT4wX6yZ8aB0Cg`。该 client 为允许 `client_credentials` 的 confidential client，管理员批准 app 目录和用户资料读取：

```http
PATCH /admin/account/apps/20/oauth-clients/201
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "clientCredentialsScopes": [
    "account:app:read",
    "account:user:read"
  ]
}
```

查询该 OAuth client 时返回保存的 `clientCredentialsScopes`。

### 令牌签发与校验

App 后端通过 `POST /account/oauth/token` 使用 `grant_type=client_credentials`，并显式请求非空的 scope 集合。Account 校验 confidential client 凭证、app 与 client 状态、允许的授权方式和 `clientCredentialsScopes`。请求范围超出批准集合时返回 OAuth 错误。该流程遵循 [OAuth client credentials grant](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4)。

App 自主访问令牌为短生命周期、可撤销的 opaque access token。它绑定 app、OAuth client 和本次签发的 scopes，只用于对应部署的 Account API。业务角色、资料和可变权限不编码在令牌值中。

该流程不签发 refresh token。令牌到期后，后端使用有效 client 凭证重新申请。并发申请由持有凭证的后端协调。

Account API 每次请求都校验令牌有效性、app 和 client 状态及允许的授权方式。接口所需 scope 必须同时属于令牌 scope 和当前 `clientCredentialsScopes`。令牌的使用对象和访问范围应明确限定，参考 [OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html#section-2)。

App 自主访问令牌不代表任何用户。其 introspection `sub` 使用 `app:{appID}` 表示 app 主体，用户令牌的 `sub` 使用稳定的 `user.id`。服务端必须区分这两类主体，不能把 app 自主访问令牌用于 `/account/user`，也不能将 app 主体解析成业务用户。

订单系统后端使用该 client 的凭证请求令牌：

```http
POST /account/oauth/token
Authorization: Basic <client-credentials>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=account%3Aapp%3Aread%20account%3Auser%3Aread
```

```json
{
  "access_token": "xb_at_opaque_app_only_reference",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "account:app:read account:user:read"
}
```

后续资料请求使用这个 app 自主访问令牌。订单系统访问 Pay 时，仍使用 Pay 授予它的凭证和支付权限。

## 资料读取与展示

### App 目录

目录查询返回 app 的稳定 ID、管理名称、展示名称、状态、时间和可选的图标、说明，不包含 OAuth 回调配置、secret、用户授权记录或业务服务凭证。

停用 app 的登记仍可查询，以保留历史引用。目录资料可以缓存，展示快照不替代稳定身份。

例如，获准读取目录的 app 查询 XBuilder 的登记资料：

```http
GET /account/apps/1
Authorization: Bearer <account-app-only-access-token>
```

```json
{
  "id": "1",
  "createdAt": "2026-10-16T08:00:00+08:00",
  "updatedAt": "2026-10-16T08:00:00+08:00",
  "name": "xbuilder",
  "displayName": "XBuilder",
  "avatar": "https://avatars.example.com/apps/1.png",
  "description": "Visual programming and interactive projects",
  "status": "active"
}
```

Pay 可以使用目录资料展示业务来源，或在接入配置中定位 app。读取目录不等于为该 app 开通 Pay，也不授予代其创建支付的能力。

### 用户资料

App 后端按稳定 `userID` 查询用户资料，查询结果使用与 `GET /account/user` 相同的 `AccountUser` 结构。`createdAt` 和 `updatedAt` 分别表示账号创建时间和最近更新时间。Account 只返回自己拥有的字段，不包含产品简介、套餐、角色、配额、商家关系或业务统计。

```http
GET /account/users/123
Authorization: Bearer <account-app-only-access-token>
```

```json
{
  "id": "123",
  "createdAt": "2026-10-16T08:00:00+08:00",
  "updatedAt": "2026-10-20T09:30:00+08:00",
  "username": "alice",
  "displayName": "Alice",
  "avatar": "https://avatars.example.com/users/123.png"
}
```

用户 ID 用于关联，昵称和头像用于展示。收货地址、收件人、物流和履约资料属于对应业务系统，不能从账号展示资料推导。

查询成功同时确认该 `userID` 属于当前 Account 部署。该结果不证明本次业务由该用户发起，也不证明调用方拥有该用户的业务资源。

购买者身份由发起业务的 app 后端根据已验证身份确定，并沿可信服务调用传递。订单或支付服务分别校验自己的调用方与业务授权。

## 接入场景

### 用户在 Pay 查看本人资料

用户通过 Pay 自己的 OAuth client 接入 Account。Pay 后端保存用户授权和 Account 令牌，并建立 Pay session。

Pay Web 使用 Pay session 请求自己的后端。后端校验 session，使用具有 `account:user:read` 的用户令牌调用 `GET /account/user`，再向前端返回页面需要的字段。

该流程使用用户委托权限，不要求 Pay 取得 app 自主访问权限。

### 订单后台查看购买者资料

订单后台首先验证当前操作者的身份、商家范围和订单权限，再从已获授权的订单确定购买者 `userID`。订单后端使用获准读取用户资料的 app 自主访问令牌，直接向 Account 查询该购买者。

Account 校验订单系统所用 OAuth client 的自主访问权限，订单系统控制操作者能查看的订单和用户。两层校验都需要执行，不能因为后端持有有效的 app 自主访问令牌，就允许前端任意指定用户 ID 查询。

Account 访问审计记录调用 app、OAuth client、目标用户和请求关联。订单系统记录实际操作者、业务资源和查询用途，保留两边日志的关联。

### 共享服务选择接入 app

账号管理员可以通过 Account 管理接口查询和管理 app。其他共享服务的管理模块需要选择 app 时，可以由自己的后端使用 `account:app:read` 提供必要目录资料。

管理模块先校验操作者访问本模块的权限，再提供目录查询或接入操作。目录读取权限不要求该操作者拥有 `accountAdmin`，也不替代相应服务的接入批准。

### 订单系统调用 Pay

产品后端使用订单系统认可的接入身份创建订单，并提交可信的购买者关联。订单系统以自己的 Pay API 凭证创建支付，提交实际业务来源和购买者标识。

Pay 中的 `appID` 表示订单系统，`businessAppID` 表示实际产品，`userID` 表示购买者。三个关联使用各自明确的业务含义。订单系统的多租户、商家和订单模型由订单系统维护。

Pay 需要查询 Account 资料时，使用自己的 Account 授权直接访问。订单系统调用 Pay 不继承 Pay 的 Account 权限，也不要求订单系统向 Pay 转发购买者的 Account 令牌。

## 凭证、授权与生命周期

Account client secret、Account 用户令牌、app 自主访问令牌、app session 和业务服务 API 凭证分别管理。它们可以关联同一个 app，但具有不同的签发方、使用对象和授权来源。

Client secret 撤销后，不能再使用该 secret 认证。已签发令牌按自己的有效期、授权和撤销状态校验。需要结束某个 client 的既有访问时，应停用该 client 或撤销相应授权。

App 停用后，Account 不再为其 clients 签发或接受 Account 访问令牌，并撤销相关授权码、refresh token 和 access token。App 登记及历史关联继续保留。

OAuth client 通过停用结束接入，并保留历史授权和审计关联。单个 client 停用时，撤销该 client 的未完成授权流程和令牌，不影响该 app 下其他 clients 的有效授权。

`clientCredentialsScopes` 收紧或清空后，Account 立即使受影响的既有 app 自主访问令牌失效。扩展权限不会扩大已签发令牌的 scope，客户端需要申请新令牌。权限配置更新、令牌签发和既有令牌失效必须可靠协调。

停用或权限收紧导致失效的授权码和令牌，不会因重新启用或恢复权限而重新生效。

撤销某个 `app_grant` 时，结束该用户对该 app 的委托访问，并使该授权关联的授权码和令牌失效。该操作不影响 client 的 app 自主访问权限，后者也不产生用户委托授权。

Account 的停用或撤销不自动修改其他系统的 API 凭证、app session 或业务资源。各系统根据自己的权限和会话规则处理接入生命周期，并继续履行已经产生的交易与审计责任。

## 缓存与不可用处理

基础展示资料允许缓存。App 登记是权威来源，历史订单或支付中的展示快照按业务语义保留，目录更新不要求重写历史交易。

缓存不替代当前请求的业务权限校验。相应的自主访问权限撤销后，调用方停止通过该 client 向 Account 刷新相关资料。缓存数据的保留与清理由业务用途决定，凭证和原始令牌不进入展示缓存。

调用方区分无权限、资源不存在和 Account 暂不可用。不能把 401、403 或网络错误当成用户不存在，也不能仅因头像刷新失败就判定账号或业务会话失效。

必须完成的身份校验无法恢复时，相关新请求返回明确的不可用结果。已落库的订单和支付使用持久化的身份与资金关联继续处理通知、对账和必要恢复，不依赖重新取得头像或名称。

## 管理台与管理权限

Account 管理模块位于 XBuilder Admin Console，由 `accountAdmin` 管理 app 登记与展示资料、OAuth clients 及其凭证和自主访问权限，以及用户授权与关联令牌。该角色的授予和判定由 XBuilder Authorization 负责。

管理操作记录操作者、app、OAuth client、变更范围和原因。Secret 只在创建时展示，普通目录读取不返回凭证、OAuth 配置或授权管理资料。

App 自主访问 scopes 只表示访问 Account 的能力。订单管理员、Pay 管理员和其他产品角色由对应业务系统管理，自主访问权限不自动产生这些角色。

## API 边界

本节描述目标接口边界。接口实现时，应在 `docs/openapi.yaml` 中定义请求、响应、认证、错误和字段约束。

### Current account endpoints

```http
GET   /account/user
PATCH /account/user
PUT   /account/user/avatar
```

- 使用绑定用户、app 和 OAuth client 的有效用户 access token，并校验相应用户 scope
- 当前用户从令牌确定，不接受其他用户 ID 作为本人资料查询条件
- Account Web 继续按账号接口契约使用 account session
- 第三方身份、账号会话和密码管理仍由相应 Account Web 或管理接口承载

### App-only endpoints

```http
GET /account/apps
GET /account/apps/{appID}
GET /account/users/{userID}
```

- 这些接口要求有效的 app 自主访问令牌，不接受用户令牌、app ID 或业务服务 API 凭证代替认证
- App 目录和单笔 app 查询要求 `account:app:read`，返回基础登记资料
- App 列表采用现有列表契约，并在认证和授权后执行查询
- 用户资料查询要求 `account:user:read`，返回 `AccountUser`，并可用于校验账号是否存在
- 用户不存在时返回 404
- 身份或授权失败分别返回 401 或 403，不作为资源不存在处理

### Account OAuth endpoints

```http
POST /account/oauth/par
GET  /account/oauth/authorize
POST /account/oauth/token
POST /account/oauth/introspect
POST /account/oauth/revoke
```

- 用户授权使用 Account 的 PAR、authorization code、PKCE 和 refresh token 契约
- App 自主访问通过 `client_credentials` 获取访问令牌，不进入用户授权页面
- 用户令牌与 app 自主访问令牌分别限制 subject、client、scope 和使用范围
- Introspection 要求 confidential client 认证，并限制在同一 app 的令牌范围内
- OAuth revocation 只允许原 client 撤销其令牌，管理员通过用户授权管理接口撤销整个 `app_grant`

### Account admin endpoints

```http
GET   /admin/account/apps
POST  /admin/account/apps
GET   /admin/account/apps/{appID}
PATCH /admin/account/apps/{appID}
PUT   /admin/account/apps/{appID}/avatar

GET   /admin/account/apps/{appID}/oauth-clients
POST  /admin/account/apps/{appID}/oauth-clients
GET   /admin/account/apps/{appID}/oauth-clients/{oauthClientID}
PATCH /admin/account/apps/{appID}/oauth-clients/{oauthClientID}

GET    /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets
POST   /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets
DELETE /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets/{secretID}

GET    /admin/account/users/{userID}/app-grants
GET    /admin/account/app-grants/{appGrantID}
DELETE /admin/account/app-grants/{appGrantID}
GET    /admin/account/app-grants/{appGrantID}/tokens
POST   /admin/account/app-grants/{appGrantID}/tokens
DELETE /admin/account/app-grants/{appGrantID}/tokens/{tokenID}
```

- 这些接口要求 `accountAdmin`，并使用 Account 管理接口的访问限制和审计规则
- 创建 app 不要求同时创建 OAuth client
- 创建 client 必须指定合法的所属 app，并按授权方式校验回调、客户端类型和凭证要求
- Client secret 绑定具体 client，轮换不改变 app 或 client 身份
- OAuth client 查询返回 `clientID` 和 `clientCredentialsScopes`，自主访问 scopes 创建时默认为空集合，批准时显式提供获准的 scopes
- 更新 `clientCredentialsScopes` 使用目标 scope 集合，清空集合表示撤销该 client 的 app 自主访问权限
- 非空 `clientCredentialsScopes` 只允许用于启用 `client_credentials` 的 confidential client，配置更新必须整体校验
- 权限配置更新与既有令牌失效必须可靠协调，不能只影响后续签发
- 用户授权以 app 为单位管理，令牌列表返回各令牌绑定的 `oauthClientID`
- 管理员创建用户访问令牌时，必须指定与授权所属 app 一致的有效 `oauthClientID`，不能绑定只允许 app 自主访问的 client
- 撤销 access token 只影响该令牌，撤销 refresh token 影响其 token family
- 撤销整个 `app_grant` 结束该用户对该 app 的全部委托访问

## 安全边界

Account 后端从有效凭证和持久化授权解析 app、OAuth client 和用户主体。请求中的 app ID、用户 ID 和展示资料不能代替调用身份或授权。

App 自主访问令牌只能使用批准的 Account 能力。不同 app、不同 OAuth client 和不同部署环境不能通过复用凭证绕过绑定。接受用户令牌的产品 API 必须拒绝将 app 主体作为用户身份。

用户委托访问与 app 自主访问分别检查令牌主体、scope 和相应授权。管理角色和产品权限独立校验。受控的 app 登记和 secret 签发不允许客户端自行扩大授权范围。

资料读取按访问方式记录用户或调用 app、OAuth client、能力、目标资源、结果和请求关联。业务系统记录实际操作者或任务身份，以及对应业务用途。令牌、secret、原始认证头和敏感资料必须脱敏。

Account 资料只返回契约允许的字段。展示名称和说明按纯文本处理，图标使用 Account 管理的可展示 URL。前端不接触 client secret，也不持有 app 自主访问令牌。
