# 站内通知 In-Product Notification

用户可能在操作完成前离开页面，也可能在离开 XBuilder 后收到点赞或 Remix。我们通过站内通知让用户之后仍能找到这些更新。各产品功能定义何时发送 Notification 及其内容，共用同一个 Notification List 和已读行为。

## 基本概念

### 通知 Notification

一个 Notification 包含：

* Recipient：可以查看它的 User
* Category：消息 Message 或公告 Announcement
* Title：更新摘要
* Body：Markdown 格式的完整消息
* CreatedAt：创建时间
* ReadAt：Recipient 首次查看的时间，未读时为空

Message 发给某个 User。Announcement 发给发布时已存在的全体 User。两类使用相同的内容结构，每个 Recipient 的已读状态相互独立。

页面展示 Title、Body 和 CreatedAt。用户名、作品链接、附件和引用上下文都放在 Body 中，不为每种事件单独增加展示字段。类别、标识、Recipient 和已读状态用于组织和处理 Notification。

内容记录事件发生时的情况。User 或 Project 改名后，已有 Notification 的内容不变。

### 通知列表 Notification List

Notification List 是当前用户收到的 Notification 集合，分为消息和公告。每个类别有自己的未读数量，导航入口展示两者之和。

Notification 按 CreatedAt 从新到旧排列，时间相同时保持稳定顺序。阅读 Notification 不改变它的位置，加载更多时也不应因已读状态变化出现遗漏或重复。

## User Story

### 查看通知

登录用户从导航栏打开 Notification List，选择查看消息或公告。打开列表或切换类别不标记已读。

打开某条 Notification 时展示详情并记录 ReadAt。阅读状态保存后，更新列表和未读数量。再次打开同一条 Notification 时保留首次阅读时间，其他 Recipient 的阅读状态不受影响。

用户可以将全部 Notification 标为已读。这会包含两个类别，以及尚未加载到面板中的通知。操作快照之后送达的通知仍为未读。

列表应区分加载中、暂无通知和请求失败。已读更新失败时，界面应恢复未读状态并允许重试。长标题和正文应能完整查看，面板不应超出视口。

Markdown 渲染应禁止可执行 HTML 和不安全的链接协议。链接遵循目标页面的访问权限。Project 后来变为私有或不可用时，Notification 仍保留在列表中，目标页面正常提示无权限或不可用。预览不能暴露受限内容。

### 收到点赞或 Remix 通知

我们建议先接入作品点赞和 Remix，以下规则需要在实现前评审确认。目前尚未完成这些业务的接入。

#### 点赞

User 成功点赞 Project 后，Project 的作者收到一条 Message。自己点赞自己的作品不发送通知。

同一 User 对同一 Project 最多发送一次通知。取消点赞不撤回已有通知，之后重新点赞也不再发送。请求重试不重复发送通知。

例如，Title 可以是“小明点赞了你的作品”。Body 包含带个人主页链接的小明的名字、“点赞了你的作品”和 Project 链接。

#### Remix

新的改编 Project 成功保存到云端后，直接来源 Project 的作者收到一条 Message。自己改编自己的作品不发送通知，也不逐级通知改编链上的所有作者。

每个新改编 Project 发送一次通知。因此，两个不同的改编作品可以产生两条 Message，后续保存和请求重试不再发送。

按照[社区模型](./community.zh.md)，Remix 最初创建私有作品。Notification 可以说明操作者并链接原 Project，但不能包含私有改编作品的标题、内容或链接。之后发布该作品也不再追加 Remix 通知。

例如，Title 可以是“小明改编了你的作品”。Body 包含小明的个人主页链接和原 Project 链接，不包含私有改编作品的信息。

只有成功的操作才发送通知。打开弹窗、取消操作、操作失败或未保存的本地编辑都不发送。功能上线时不补发历史点赞和 Remix 通知。

### 收到公告

可信的产品运营方可以发送 Announcement，例如版本更新或维护通知。普通用户不能发布公告。

例如，一条 Title 为“系统维护通知”的 Announcement，在 Markdown 正文中说明维护时间、受影响的功能和准备事项。

发布时已存在的每个 User 收到一份，初始为未读。重试发送时保持原定接收者，不重复发送。之后注册的用户不会收到这条历史公告。

## 范围与相关工作

[Demo #3493](https://github.com/goplus/builder/pull/3493) 演示了点赞、Remix、关注和反馈回复。其中的模拟数据用于演示，不定义正式数据协议。关注和反馈回复的触发时机及重复通知规则需要另行设计。

复制链接或打开分享弹窗无法确定是否送达，也没有明确的 Recipient，因此不发送通知。接入“分享给指定用户”之前，需要先定义 Recipient 和发送成功的事件。

私聊、邮件或推送、通知偏好、事件聚合和公告发布界面不在本次范围内。

[后端基础设施 #355](https://github.com/goplus/builder-backend/pull/355) 提供存储和读取接口，业务触发与前端接入是独立工作。交互可参考[通知 Demo #3493](https://github.com/goplus/builder/pull/3493)。
