# 用户反馈 Feedback

用户在使用 XBuilder 时可能遇到功能异常、运行结果不符合预期，或不知道如何继续操作。Feedback 允许用户直接描述问题，并在同意后附带当前工程的诊断信息，帮助管理员定位问题。

## 背景

用户反馈通常只包含一段文字，管理员还需要询问用户所在页面、工程状态和错误信息，才能开始排查。

因此，Feedback 除了保存用户填写的内容，也可以保存提交时采集的工程诊断上下文。用户可以决定是否分享这些信息，管理员则通过统一的反馈列表进行查看和处理。

## 目标

* 用户可以在 XBuilder 内提交反馈。
* Feedback 可以附带提交时的工程诊断信息。
* Copilot 可以帮助用户整理反馈，但最终内容由用户确认和提交。
* Copilot 暂时不可用或额度耗尽时，用户仍然可以使用反馈入口。
* 管理员可以查看、处理并回复 Feedback。
* 用户可以在 XBuilder 内收到管理员回复。

## 基本概念与规则

### Feedback

一条 Feedback 包含：

* User
* Title
* Description
* Attachments
* Diagnostic Context
* Status
* CreatedAt
* Reply

Title 最多 100 个字符，Description 最多 2000 个字符。

Feedback 有三种状态：

| 状态 | 含义 |
| - | - |
| `new` | 尚未处理 |
| `replied` | 管理员已经回复 |
| `handled` | 管理员已处理，不需要回复 |

状态只能按以下方向变化：

```text
new -> replied
new -> handled
```

`replied` 与 `handled` 是终态。一条 Feedback 只处理一次，只允许有一条 Reply。

### Diagnostic Context

Diagnostic Context 是用户确认提交 Feedback 时采集的诊断信息，包括：

* 当前页面、语言和采集时间
* 当前工程的标识、类型、名称和资源结构
* 当前选中的角色及其基本状态
* 当前代码文件、光标、选区和附近代码
* 当前工程中的代码错误和警告
* 最近 50 条运行输出

上下文在用户确认提交时采集，而不是在打开表单时采集。工程在提交后继续发生变化，不会更新已经保存的 Diagnostic Context。

用户可以关闭“分享诊断信息”，关闭后不采集 Diagnostic Context。部分诊断信息不可用时可以省略对应内容，但不能因此阻止 Feedback 提交。

### Attachment

Feedback 提交时自动生成的页面截图作为图片附件处理。管理员发送 Reply 时允许添加图片。

图片大小上限沿用 Upload Session 返回的 `maxSize`。客户端生成截图后进行检查，服务端与对象存储仍需再次检查：

* 图片超过 `maxSize` 时返回 `413 Content Too Large`。
* 文件不是支持的图片时返回 `415 Unsupported Media Type`。

附件复用现有上传会话和 Kodo 存储能力。Feedback 保存附件 ID、文件名、媒体类型、大小和对象引用，不保存公开下载地址。

下载附件前必须校验访问者是 Feedback 提交用户或拥有 `feedbackAdmin` 角色，再返回短期有效的签名地址。附件不能作为公开资源独立访问。

### Reply

Reply 是管理员针对 Feedback 给出的处理结果，包括文字和可选的图片附件。

Reply 保存成功后，Feedback 状态变为 `replied`，并为原提交用户创建一条站内通知。

### In-product Notification

In-product Notification 用于把管理员回复交给用户。

通知包含回复内容、回复时间和回复附件。用户可以从导航栏查看未读数量、通知列表和通知详情。

## 用户流程

### 提交 Feedback

用户从右上角头像菜单打开“提交反馈”，填写标题和描述，并决定是否分享 Diagnostic Context。

提交过程中显示进行中状态，避免用户重复操作。只有服务端确认创建成功后，才显示成功提示并关闭表单。提交失败时保留用户输入，并提供重试。

同一次提交使用稳定的 Submission ID：

* Submission ID 与内容均相同，返回已经创建的 Feedback。
* Submission ID 相同但内容不同，返回 `409 Conflict`。
* 内容相同但 Submission ID 不同，不自动合并。

### Copilot 辅助

当用户明确提出需要反馈，或接受 Copilot 的建议后，Copilot 可以生成 Title 和 Description 草稿并打开 Feedback 表单。

用户可以修改草稿并决定是否分享上下文。Copilot 不能直接提交 Feedback，也不能在用户未确认时打开表单。

### Copilot 额度耗尽

额度耗尽提示中可以提供直接打开 Feedback 表单的操作。用户也始终可以从头像菜单进入 Feedback。

## 管理员流程

反馈管理员对应的角色为 `feedbackAdmin`，并派生 `canManageFeedback` capability。

`feedbackAdmin` 可以：

* 查看 Feedback 列表和详情
* 查看用户同意分享的 Diagnostic Context
* 下载 Feedback 附件
* 回复 `new` 状态的 Feedback
* 将 Feedback 标记为 `handled`

`authorizationAdmin` 可以为用户配置 `feedbackAdmin`。其他管理员角色不包含反馈管理权限。

前端通过 `canManageFeedback` 控制管理入口，后端 Admin API 仍必须独立检查 `feedbackAdmin`。

管理员处理同一条 Feedback 时采用先到先得：

* 第一个成功的处理操作生效。
* 后续操作返回 `409 Conflict`。
* 已保存的 Reply 不被覆盖。
* 前端重新加载 Feedback，并展示已经生效的状态。

管理员也可以借助内部工具对反馈进行归类，并筛选其中可能对应工程 Issue 的内容。

### 回复失败

Reply、状态变化和 In-product Notification 作为一次完整操作保存。

如果任一步骤失败：

* Feedback 保持 `new`。
* 不保存不完整的 Reply。
* 不创建用户通知。
* 管理员填写的回复和选择的图片继续保留。
* 界面提示回复失败，并允许重试。

只有整个操作成功后，界面才显示“回复已发送”。

### 重复处理

Feedback 进入终态后，不再接受处理请求。

如果管理员因为网络超时重复发送请求，服务端根据当前状态拒绝再次处理，不重复创建 Reply 或 Notification。前端重新加载 Feedback，并展示已经保存的结果。

### 通知失败

站内通知记录与 Reply 一同保存。通知记录创建失败时，整个回复操作失败，Feedback 不会进入 `replied` 状态。

通知记录保存后，即使导航栏角标刷新失败，用户下次打开通知中心时仍然可以查看已经保存的通知。

将 Feedback 标记为 `handled` 时不发送 Notification。

## User Story

### 用户提交反馈

用户填写问题，决定是否分享 Diagnostic Context 后提交 Feedback。提交成功时看到明确的完成状态；提交失败时可以在原内容基础上重试。

### 用户请 Copilot 整理反馈

Copilot 根据用户明确的请求生成草稿，用户检查和修改内容后提交 Feedback。

### 管理员处理反馈

拥有 `feedbackAdmin` 的管理员查看 Feedback 详情，回复用户或将其标记为无需回复。并发处理时，界面展示最终生效的处理结果。

### 用户查看回复

管理员回复后，用户在导航栏看到未读通知，并可以查看回复内容和图片附件。
