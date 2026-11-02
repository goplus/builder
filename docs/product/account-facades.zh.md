# XBuilder Account facades

Account facade 是 XBuilder Account 在各平台提供的统一登录入口，承载登录认证、账号交互和授权结果返回。本文将使用这些入口完成登录的自有 app 称为接入 app。

本文档定义 Account facades 的产品行为和系统边界。账号主体与基础能力见 [XBuilder Account](account.zh.md)，自有 app 与 OAuth client 的关系遵循[自有 app 登记与接入设计](https://github.com/aofei/fork.goplus.builder/blob/8fec376d25abc45377825d607a17095137df2cbb/docs/product/account-app-integration.zh.md)。具体接口与实现方案见[技术设计](../develop/account-facades.zh.md)，完整 OpenAPI 契约由 `docs/openapi.yaml` 定义。

## 背景与目标

XBuilder 和其他自有 app 在浏览器、小程序和原生应用中使用同一个 XBuilder 账号，但各环境获取第三方身份、打开登录入口和返回结果的方式不同。Account facade 处理这些平台差异，接入 app 使用统一的账号与授权规则。

目标包括：

- 提供一致的登录、账号选择、授权和返回体验
- 在同一 facade 内复用 Account session，为不同接入 app 分别授权
- 由 Account 集中对接第三方身份提供方并执行账号规则
- 处理取消与过期，并支持中断和回跳丢失后的恢复

非目标包括：

- 在不同 facade 或产品之间共享 Account session 凭证
- 集中管理各接入 app 的产品角色和业务权限
- 面向任意第三方 app 的公开身份平台或 app 自助注册

## 入口与承载

| Account facade | 承载位置 | 覆盖环境 |
| - | - | - |
| Account Web | `account.xbuilder.com` | 普通浏览器、微信内置浏览器 H5、系统认证浏览器 |
| Account WeChat | XBuilder 主小程序中的 Account 模块 | 移动端和桌面端微信小程序 |
| Account iOS / Android | 对应平台的 XBuilder 主 app 中的 Account 模块 | 后续接入的 iOS、Android 原生应用 |

首期设计覆盖 Account Web 与 Account WeChat。本文对 Account iOS / Android 仅说明承载位置和共同规则。

使用 Account Web 时，接入 app 在浏览器中打开 Account 授权入口。首期原生应用通过系统浏览器或系统认证会话接入，遵循 [OAuth 原生应用接入要求](https://www.rfc-editor.org/rfc/rfc8252.html)。

使用 Account WeChat 时，接入 app 通过微信的小程序跳转能力打开入口，XBuilder 主小程序直接打开本地 Account 模块。小程序 `web-view` 内的业务网页通过宿主小程序接入，具体流程见[小程序内网页](#小程序内网页)。

## 系统边界

| 模块 | 职责 |
| - | - |
| Account facade | 展示可信的请求信息，承载登录与认证协助交互，保管本入口的会话凭证并返回授权结果或认证状态 |
| Account 后端 | 验证凭证，确定账号，管理交互状态和会话，校验授权请求并签发结果 |
| 接入 app 前端 | 发起登录并打开入口，保存请求关联，校验返回并恢复原业务页面 |
| 接入 app 后端 | 创建 OAuth 授权请求，兑换授权码，建立或校验产品登录态，并执行产品权限规则 |

接入 app 前端通过自己的后端发起授权，不实现 Account 登录界面，也不收集用于 Account 登录的第三方凭证或密码。

同一个产品的 Web、小程序和原生版本可以属于同一个 app，使用不同的 OAuth client。`app.id` 标识产品，`client_id` 标识具体接入配置。Account 根据登记的 OAuth client 和所属 app 提供可信的请求方名称与图标。

XBuilder 主 app 的产品功能同样通过自己的 OAuth client 取得产品登录态。

## 会话与授权

### Account session

Account session 记录用户在当前浏览器或 app 中通过 facade 登录的状态，用于后续为不同接入 app 完成授权。会话由 Account 后端创建、验证和撤销，各 facade 独立持有自己的会话凭证，不向接入 app 分发。用户选择复用有效会话时无需重复认证，后端要求重新认证时除外。

| 入口 | 会话凭证 |
| - | - |
| Account Web | 使用 Account Web 域名下的 cookie，安全要求沿用 [Account session 规则](account.zh.md#token-与-session-策略) |
| Account WeChat | 使用 Account 签发的不透明会话凭证，保存在主小程序自己的存储中，由 Account 模块提交 |

Account session 与产品登录态分别管理。用户访问令牌、app 自主访问令牌和 `app_grant` 不能代替 Account session，Account session 也不作为产品 API 凭证。Account Web 使用 cookie 认证的状态变更接口执行 CSRF 防护，小程序接口独立验证其会话凭证。

| 操作 | 影响 |
| - | - |
| 产品退出登录 | 按选用的接入模型结束产品会话或撤销相应 OAuth 令牌 |
| 取消或拒绝某次授权 | 结束该授权请求，不撤销已建立的 Account session |
| Account facade 退出登录或会话被撤销 | 结束相应 Account session，不默认撤销各产品已有的令牌或会话 |
| 切换账号 | 用户明确确认后影响后续授权，不替换各产品已有的登录态 |

### 授权流程

接入 app 使用 authorization code flow、PAR 和 PKCE S256。PAR 保存 OAuth client、授权范围、回调地址、`state` 和 PKCE challenge，返回短生命周期的不透明 `request_uri`，遵循 [OAuth PAR](https://www.rfc-editor.org/rfc/rfc9126.html)。PAR 不承载第三方凭证，第三方认证由 facade 发起。

请求引用仅用于定位流程。接入 app 后端私有保存恢复凭证，用于查询授权状态、取消未完成请求和准备续接入口，不能据此读取授权码。Account facade 私有保存流程凭证，按绑定关系操作请求，认证结果仅由承载原授权流程的 facade 读取。

1. 接入 app 后端创建授权请求，保存 `state`、PKCE verifier 和 Account 返回的恢复凭证，前端保存请求关联与原业务位置
2. 接入 app 前端使用后端准备的入口信息按平台打开 Account facade，PKCE verifier 和恢复凭证不进入跳转参数
3. Account facade 读取后端保存的请求上下文，使用有效的 Account session 或发起认证
4. Account facade 承载必要的账号交互，由 Account 后端确定账号并建立或复用本入口的 Account session
5. 用户完成必要的授权确认后，Account 返回绑定原 OAuth client 的授权码与 `state`，拒绝授权时返回 OAuth 错误与 `state`
6. 接入 app 校验返回与原请求的关联，通过自己的后端兑换授权码，确认产品登录态后显示登录成功并恢复原业务页面

已有 Account session 时，facade 展示当前账号，提供继续和选择其他登录方式的入口。首次向某个 app 授权或申请扩大授权范围时，展示请求方和本次权限，由用户确认。

补充信息、账号绑定确认、身份冲突处理和重新认证使用 Account 后端的统一规则。签发授权码时，后端校验 Account session 有效且账号与用户确认的一致，账号变化时由用户重新确认。后续账号切换不改变已签发授权码关联的账号。

授权请求、回调、PKCE 和授权码始终绑定原 OAuth client，同一 app 下的不同 OAuth client 分别完成各自的流程。接入 app 后端沿用 Account-issued token model 或 App-owned session model。

Account facade 向接入 app 返回时只携带 Account 授权结果，不携带第三方凭证、Account session 凭证或产品令牌。敏感凭证不进入分享内容、分析、错误上报或日志。

## 登录方式

### 可选方式

各 facade 按平台能力提供已配置且能完成认证的登录方式。浏览器选择遵循身份提供方的要求，例如 [Google 的浏览器安全要求](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers)。需要跨入口认证时，提前说明所需操作，用户选定方式后不重复要求选择。

普通登录时，Account Web 提供微信、QQ、GitHub、Apple、Google、X 和管理员托管密码登录。Account WeChat 也提供这些方式的登录入口，其中微信与管理员托管密码在小程序内完成，其他第三方认证通过 Account Web 在受支持的浏览器中完成。密码登录沿用 Account 的管理员托管密码规则。

### 微信认证

| 场景 | 微信认证方式 |
| - | - |
| Account Web 的普通桌面浏览器入口 | 微信网站应用登录 |
| Account Web 的微信外移动浏览器入口 | 用户通过 [URL Link](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-link.html) 打开 XBuilder 主小程序，认证后恢复原浏览器流程 |
| Account Web 的移动端与桌面端微信 H5 入口 | [服务号 `snsapi_userinfo` 网页授权](https://developers.weixin.qq.com/doc/service/guide/h5/auth.html) |
| Account WeChat | 主小程序调用 [`wx.login()`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)，Account 后端通过 `code2Session` 验证 |

`wx.login()` 返回的 `code` 用于微信身份验证，接入 app 收到的则是 Account 为其 OAuth client 签发的授权码。

服务号网页授权由用户操作发起，需要时确认授权，用户不必关注服务号。不兼容的客户端提供由用户选择的网站应用登录入口。

### 跨入口认证

在跨入口认证中，承载原授权流程的 facade 是发起入口，执行选定认证的 facade 是协助入口。协助入口只完成本次身份验证，不另行创建接入 app 的授权请求。

发起入口创建绑定认证方式、操作目的和原授权请求的认证请求，认证链接仅携带公开请求引用。协助入口展示可信的请求方、发起入口、认证方式、操作目的和与发起入口相同的校验码。用户核对后确认认证，协助入口仅执行指定认证，不以自身已有的 Account session 代替本次身份验证。

| 发起入口与所选方式 | 用户路径 |
| - | - |
| Account WeChat 的其他第三方登录 | 在小程序中复制认证链接，到系统浏览器中的 Account Web 完成已选认证 |
| Account Web 中微信以外的第三方登录受浏览器限制 | 复制认证链接，到受支持的系统浏览器中的 Account Web 完成已选认证 |
| 微信外移动浏览器中 Account Web 的微信登录 | 通过 URL Link 打开 XBuilder 主小程序，在协助入口完成微信认证 |

Account 后端保存认证结果。协助入口在认证结束后说明结果并引导用户返回，不因本次认证创建、切换或撤销自身的 Account session。支持直接返回时提供操作，否则提示用户手动返回。

发起入口恢复时凭自己的流程凭证读取认证结果。认证成功后，发起入口承载必要的账号交互，经用户确认后建立或复用本入口的 Account session，并继续原授权。两个入口不交换流程凭证或会话凭证。

URL Link 适用于非个人主体已发布的小程序，不能据此假定存在可返回的小程序打开关系或能够自动回到原浏览器页面。

### 配置与身份

第三方登录所需的应用配置和密钥由 Account 的部署配置或服务端受控配置管理。Account 后端根据执行认证的 facade 和认证方式选择预先登记的配置，并在本次认证中保持不变。

各 facade 共用第三方身份的稳定主体标识和绑定关系，不使用第三方返回的邮箱或用户名自动匹配 Account 账号。

微信的网站应用、已认证服务号和 XBuilder 主小程序绑定到同一个微信开放平台账号。Account 使用 [`unionid`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html) 解析统一微信身份，`openid` 仅作为对应应用命名空间中的辅助标识。缺少必需的 `unionid` 时返回认证或配置错误。

一次性凭证在验证时单次消费，后续交互使用已验证身份，不重用原始凭证。Account 的登录结果不包含身份提供方的令牌或微信 `session_key`。

## 微信小程序接入

### 发起与返回

接入 app 使用 XBuilder 主小程序的 AppID 和 Account 页面路径定位入口。跨小程序授权还需由 Account 后端按 OAuth client 登记允许的调用方小程序 AppID 与对应 OAuth 回调，返回后的业务页面由接入 app 管理。

Account 后端只使用 XBuilder 主小程序的 AppID/AppSecret 验证微信用户身份，接入 app 无需提供自己的微信 AppSecret。

跨小程序授权请求准备完成后启用登录按钮，由用户点击打开 XBuilder 主小程序的 Account 入口并传递准备好的入口信息。全屏入口使用 [`wx.navigateToMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.navigateToMiniProgram.html)，已建立半屏调用关系且客户端支持时可使用 [`wx.openEmbeddedMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/openEmbeddedMiniProgram.html)。

Account 模块根据后端保存的请求类型处理入口：

| 请求场景 | 处理与返回 |
| - | - |
| 接入 app 跨小程序授权 | 首次进入时校验来源小程序与登记调用方一致，授权结果通过 [`wx.navigateBackMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.navigateBackMiniProgram.html) 的 `extraData` 返回原小程序 |
| 主小程序内部授权 | 通过本地 Account 模块完成，返回发起授权的业务页面 |
| 协助 Account Web 认证 | 仅完成本次微信身份验证，引导用户回到原浏览器页面继续 |

跨小程序授权恢复时沿用已保存的请求关联，返回对象始终由原请求确定。当前打开关系与原调用方匹配时才使用返回接口，无法返回时引导用户回到原接入 app。接入 app 在 `App.onShow` 中校验请求关联与结果，缺少返回数据时按原请求恢复。

### 小程序内网页

业务 H5 通过自己的后端创建授权请求，再通过 `wx.miniProgram.navigateTo` 进入宿主的原生登录页面。宿主为 XBuilder 主小程序时使用本地 Account 模块，其他宿主由用户点击跳转到 Account WeChat。

网页后端保管 PKCE verifier 和恢复凭证，网页保留自己的请求关联。宿主只接收跳转所需的入口信息和公开关联，不兑换网页的授权码，也不将宿主产品登录态注入网页。

宿主收到结果后，在原 `web-view` 中打开登记的业务回调，携带授权码与 `state` 或 OAuth 错误。业务回调与原网页同源，并符合宿主的业务域名配置。网页校验原请求关联，通过自己的后端兑换授权码，建立业务登录态并恢复原业务页面。

缺少返回数据时，先恢复原业务页面，由网页通过自己的后端查询状态，需要接收已签发结果时重新打开原 Account 入口。`web-view` 的 [`postMessage`](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html) 仅在后退、组件销毁等特定生命周期时机送达，不作为实时完成通知。

### 发布要求

Account WeChat 须满足[微信小程序运营规范](https://developers.weixin.qq.com/miniprogram/product/index.html)对跨小程序依赖和授权登录的要求。未经平台允许，不得将使用另一个小程序设为功能使用前提，主体或开放平台绑定关系不代替该许可。

## 中断与恢复

Account 后端分别保存授权请求与认证请求的状态、到期时间和结果。接入 app 恢复自己的授权请求，发起入口恢复自己的认证请求。界面按后端确认的结果更新状态，进入前台、收到回调或缺少返回数据都不能单独判定成功或取消。

同一授权请求内，用户改选方式或重新发起认证后，前一次认证的结果不再用于完成该授权。

| 情况 | 行为 |
| - | - |
| 跨入口认证成功但未返回 | 发起入口恢复仍有效的认证结果，确认账号后继续原流程 |
| 认证取消、失败、到期或结果无法恢复 | 原授权请求仍有效时，允许用户在发起入口重新认证或改选方式 |
| 授权码已签发但未返回 | 接入 app 准备续接入口，由原 facade 通过登记的返回通道重送仍有效且未消费的同一授权码 |
| 授权码兑换结果未知 | 接入 app 向自己的后端确认，无法恢复时重新发起，不重用授权码 |
| 返回时流程尚未完成 | 展示未完成状态，提供继续或取消操作 |
| 未完成授权的 facade 流程凭证丢失 | 重新进入并绑定入口，取消旧认证并清除其结果，再确认账号或重新认证 |
| 已授权请求的 facade 流程凭证丢失，或接入 app 无法恢复本地登录流程 | 由接入 app 重新发起授权，不撤销已建立的 Account session |
| 用户取消接入 app 发起的入口跳转、拒绝向该 app 授权或结束本次登录 | 结束未完成的授权请求，按原请求返回取消或拒绝结果 |
| 未完成的授权请求或授权码失效 | 说明原因，由接入 app 重新发起授权 |
| 请求有效期内的暂时故障 | 保留请求关联，允许显式重试 |
| 重复回调、前台事件或并发处理 | 按请求关联去重，复用已确认结果，不重复签发授权码或建立产品登录态 |

已结束请求的结果不被后续回调改写。恢复或重新认证不延长原授权请求的有效期，也不重新启用已消费或被撤销的凭证。

## 首期交付与验收

首期交付 Account Web 与 Account WeChat，完成一个接入 app 的真实跨小程序登录，并通过第二个接入 app 验证同一 Account session 的复用和各自 OAuth client 的授权。原生平台 facade 和完整账号设置界面不在本期范围。

验收包括：

- 主小程序内部与跨小程序授权、已启用登录方式的认证及跨入口协助
- 已绑定和未绑定的身份、缺少必需标识、会话复用、账号切换和协助入口会话保持
- 会话过期或撤销、app 或 OAuth client 停用、请求方与来源不匹配
- 取消认证与取消授权、认证与授权到期、改选后旧结果到达、暂时故障、回跳丢失、进程重建和并发处理
- 普通浏览器、系统认证浏览器、移动端与桌面端微信 H5、小程序及其内嵌网页的完整流程

微信相关流程使用关闭调试的真实客户端验证，记录客户端版本和调用场景，并验证半屏入口不可用时的全屏流程。
