# 站内通知 In-Product Notification

XBuilder 使用站内通知在产品内传递更新。各产品功能定义何时发送 Notification 及其内容。

## 背景

有些产品操作会在用户离开起始页面后才完成。其他用户或平台的更新也可能在用户不使用 XBuilder 时送达。用户回来后需要有地方查看这些内容。

## 目标

* 用户可以找到与自己相关的产品更新。
* 用户可以区分未读和已读通知。
* 各产品功能共用 Notification List、内容格式和已读行为。

## 基本概念

### 通知 Notification

一个 Notification 包含：

* Recipient：可以查看它的 User
* Category：Notification 的类别，例如 Message、Announcement
* Title：更新摘要
* Body：Markdown 格式的完整消息
* CreatedAt：创建时间
* ReadAt：Recipient 首次查看的时间，未读时为空

页面展示 Title、Body 和 CreatedAt。用户名、作品链接、附件和引用上下文都放在 Body 中，不为每种事件单独增加展示字段。

### 通知列表 Notification List

Notification List 是当前用户收到的 Notification 集合，按 Category 分组。

## 核心机制

### 创建 Notification

产品功能为 Recipient 创建 Notification，并根据前端的展示方式设置 Category。新收到的 Notification 为未读状态。

### 列出通知

每个类别有自己的未读数量，导航入口展示两者之和。Notification 按 CreatedAt 从新到旧排列，时间相同时保持稳定顺序。阅读 Notification 不改变它的位置，加载更多时也不应因已读状态变化出现遗漏或重复。

### 阅读 Notification

打开列表或切换类别不标记已读。打开某条 Notification 时展示详情并记录 ReadAt。阅读状态保存后，更新列表和未读数量。再次打开时保留首次阅读时间。

系统处理“全部标为已读”时，会将两个类别中已送达的通知标为已读，包括尚未加载到面板中的通知。这些通知不再计入未读数量；之后送达的通知仍为未读，并计入对应类别的未读数量。

## User Story

### 查看通知

用户回到 XBuilder 后，发现有未读 Notification。他从导航栏打开 Notification List。Category 为 Message 的 Notification 显示在消息 Tab，Category 为 Announcement 的 Notification 显示在公告 Tab。查看完两个 Tab 后，用户将剩余 Notification 全部标为已读。
