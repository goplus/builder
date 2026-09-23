# 站内通知 In-Product Notification

XBuilder 通过站内通知让用户离开原页面后仍能查看产品更新。点赞、Remix、反馈回复等功能都可以使用 Notification，具体的触发事件和内容由各功能定义。

## 基本概念

### 通知 Notification

一个 Notification 包含：

* Recipient：可以查看它的 User
* Category：消息 Message 或公告 Announcement
* Title：更新摘要
* Body：Markdown 格式的完整消息
* CreatedAt：创建时间
* ReadAt：Recipient 首次查看的时间，未读时为空

Message 发给某个 User。Announcement 发给发布时已存在的全体 User。之后注册的用户不会自动收到历史公告。

两类使用相同的内容结构，每个 Recipient 的已读状态相互独立。新收到的 Notification 为未读状态。

页面展示 Title、Body 和 CreatedAt。用户名、作品链接、附件和引用上下文都放在 Body 中，不为每种事件单独增加展示字段。

### 通知列表 Notification List

Notification List 是当前用户收到的 Notification 集合，分为消息和公告。每个类别有自己的未读数量，导航入口展示两者之和。

Notification 按 CreatedAt 从新到旧排列，时间相同时保持稳定顺序。阅读 Notification 不改变它的位置，加载更多时也不应因已读状态变化出现遗漏或重复。

## User Story

### 查看通知

登录用户从导航栏打开 Notification List，选择查看消息或公告。打开列表或切换类别不标记已读。

打开某条 Notification 时展示详情并记录 ReadAt。阅读状态保存后，更新列表和未读数量。再次打开同一条 Notification 时保留首次阅读时间。

列表应区分加载中、暂无通知和请求失败。已读更新失败时，界面应恢复未读状态并允许重试。长标题和正文应能在视口内完整查看。

Markdown 渲染应禁止可执行 HTML 和不安全的链接协议。链接和预览遵循所引用资源的访问权限。

### 全部标为已读

用户可以将全部 Notification 标为已读。这会包含两个类别，以及尚未加载到面板中的通知。操作快照之后送达的通知仍为未读。
