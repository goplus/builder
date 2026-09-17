# 站内通知 In-Product Notification

XBuilder 使用 In-Product Notification 在站内向用户传递异步的产品更新。Notification 是可复用的传递机制；创建通知的产品功能负责定义触发事件和通知内容。

## 背景

部分产品操作会在用户离开起始页面后完成。XBuilder 提供持久入口，让用户离开原页面后仍可查看结果。

## 目标

* 用户可以在 XBuilder 内找到发送给自己的产品更新。
* 用户可以区分未读和已读通知。
* 各产品功能共用 Notification List 和已读状态行为。

## 基本概念

### Notification

Notification 是针对一个 User、用于传递某个产品事件的消息。

一个 Notification 包含：

* Recipient：可以查看 Notification 的 User
* Title：更新摘要
* Body：完整消息
* CreatedAt：创建时间
* ReadAt：Recipient 查看 Notification 的时间，未读时为空

### 通知列表 Notification List

Notification List 是当前用户收到的 Notification 集合，提供未读数量，并按最新到最早的顺序展示通知。

## 核心机制

### 创建 Notification

产品功能为 Recipient 创建 Notification。新 Notification 为未读状态，并根据 CreatedAt 显示在 Notification List 中。

### 查看 Notification

用户从导航栏打开 Notification List。打开某条 Notification 时展示详情并记录阅读时间；已读状态变化后更新未读数量。
