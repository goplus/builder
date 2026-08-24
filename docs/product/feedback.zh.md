# 用户反馈 Feedback

Feedback 允许用户描述在 XBuilder 中遇到的问题，并在用户同意后分享帮助管理员排查问题的 Context。

## 背景

简短的问题描述通常不足以复现问题。管理员还可能需要了解问题发生时的页面、工程状态、代码、诊断信息和运行输出。

Feedback 将用户填写的内容与其同意分享的 Context 保存在同一条记录中，帮助管理员减少追问并开始处理问题。

## 目标

* 用户可以在 XBuilder 内提交 Feedback。
* 用户可以在 Feedback 中包含提交时采集的 Context。
* Copilot 可以准备 Feedback 草稿，交由用户检查和提交。
* 支持的 AI 功能可以在出现功能或额度问题时提供 Feedback 入口。
* 管理员可以排查、处理并回复 Feedback。
* 用户可以在 XBuilder 内收到管理员回复。

## 基本概念与规则

### 反馈 Feedback

一条 Feedback 包含：

* User：提交 Feedback 的用户
* Title：问题概述，最多 100 个字符
* Description：问题描述，最多 2000 个字符
* Context：用户选择分享的诊断信息，可选
* Status：处理状态
* CreatedAt：提交时间
* Reply：一条管理员回复，在 Feedback 进入 `replied` 时保存

Feedback 有三种状态：

| 状态 | 含义 |
| - | - |
| `new` | 等待管理员处理 |
| `replied` | 管理员已完成回复 |
| `handled` | 管理员通过“标记为已处理”完成处理 |

Feedback 创建时为 `new`，可以从 `new` 进入 `replied` 或 `handled`；两者均为终态。

### 上下文 Context

Context 是随 Feedback 分享的诊断信息，包括以下类别中的可用信息：

* Source：打开 Feedback 的功能和入口
* 当前页面、语言和采集时间
* 当前工程的标识、类型、名称和资源结构
* 当前选中的角色及其基本状态
* 当前代码文件、光标、选区和附近代码
* 当前工程中的代码错误和警告
* 当前工程的运行输出
* Project Snapshot
* 当前页面截图

Context 遵循以下规则：

* 开启“分享诊断信息”后，Feedback 包含当时可用的 Context。
* Context 在用户确认提交时采集，并在提交后保持固定。
* 附近代码包含当前光标附近最多 21 行，运行输出包含最近 50 条。
* Project Snapshot 和当前页面截图单独保存，Feedback 保存它们的引用。两者沿用现有的上传大小限制。
* 单项内容不可用或超过限制时，Feedback 包含其余 Context，并可以继续提交。

### 项目快照 Project Snapshot

Project Snapshot 是用户提交 Feedback 时捕获的完整工程文件内容，以编辑器使用的 `Files` 集合表示。

## 权限管理

反馈管理员对应的角色为 `feedbackAdmin`，并派生 `canManageFeedback` capability。

用户可以读取自己提交的 Feedback。`feedbackAdmin` 可以：

* 查看 Feedback 列表和详情
* 在编辑器中打开其中的 Project Snapshot
* 回复 `new` 状态的 Feedback
* 将 `new` 状态的 Feedback 标记为 `handled`

`authorizationAdmin` 可以配置 `feedbackAdmin` 角色。

## 核心机制

### 提交与采集

用户从头像菜单打开 Feedback 表单，填写 Title 和 Description，并提交 Feedback。

提交过程中，表单显示进行中状态。提交失败时，表单保留已填写的内容，并提供重试操作。

### Copilot 辅助

当用户提出需要提交 Feedback，或接受 Copilot 的建议后，Copilot 可以准备 Title 和 Description 草稿。用户确认打开 Feedback 表单后，可以检查草稿、决定是否分享 Context，然后提交 Feedback。

### AI 功能与额度问题反馈

Copilot、Costume 生成和 Animation 生成分别展示对应的功能与额度问题提示。提示可以提供打开 Feedback 表单的操作，Source 记录对应的功能和入口。

### 查看 Project Snapshot

管理员可以从 Feedback 详情通过编辑器可复用的本地工程加载能力打开 Project Snapshot。编辑器将快照中的 `Files` 加载到本地会话中，供管理员查看和运行 Feedback 提交时的工程。

### 处理 Feedback

多名管理员并发处理同一条 `new` 状态的 Feedback 时，第一个成功的操作决定其终态，其他管理员看到最终生效的状态。

### 回复与通知

管理员成功发送 Reply 后，Feedback 进入 `replied` 状态，并为提交用户创建 [In-Product Notification](./in-product-notification.zh.md)。发送 Reply 失败时，表单保留草稿，管理员可以重试。

## User Story

### 提交 Feedback

用户可以从头像菜单打开 Feedback 表单，也可以在请 Copilot 准备草稿后，或通过 AI 功能与额度问题提示打开表单。用户检查 Title 和 Description，选择是否分享 Context，然后提交 Feedback。提交成功后创建一条 `new` 状态的 Feedback；提交失败时，表单保留已填写的内容，供用户重试。

### 处理 Feedback

`feedbackAdmin` 打开一条 `new` 状态的 Feedback，根据 Title、Description 和可用的 Context 排查问题。管理员可以在本地编辑器会话中打开 Project Snapshot，然后发送 Reply 或将 Feedback 标记为 `handled`。成功发送 Reply 后，Feedback 进入 `replied`，并为提交用户创建 In-Product Notification。发送 Reply 失败时，草稿保留，供管理员重试。其他管理员先完成处理时，界面显示最终生效的终态。
