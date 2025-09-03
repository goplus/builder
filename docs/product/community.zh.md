# 社区 Community

搭建社区的目的：

* 促进创作热情：体验别人创作的优秀项目
* 降低创作门槛：在别的项目基础上继续创作
* 提高创作能力：学习别的项目如何实现功能

本文档中说的社区 Community 指为搭建社区、实现上述目的而构建的一系列能力，包括但不限于

* 围绕 Project 的操作，如发布、运行、评论、点赞、改编等
* 围绕 User 的操作，如个人信息管理、关注等
* 围绕团队的操作，如创建、管理、甚至利益分配等

## 基本概念

### 关注 Follow

用户可以通过 Follow 其他用户以及时获取其动态信息。当 A Follow B 后，记 A 为 B 的 Follower，B 为 A 的 Followee。

长期来看，“动态信息”可能包括但不限于：

* Followee 的新 Project
* Followee 的新 Release
* Followee 的新 Followee

获取动态信息的渠道可能包括但不限于：

* Follower 的首页推荐内容
* Follower 的消息通知（站内信、邮件、...）

### 喜欢 Like

用户可以 Like 他喜欢的 Project，除了对 Project 表示喜爱外，还可以方便自己日后查找。长期来看，我们也可能根据用户的 Like 信息为用户推荐内容。

### 用户 User

在 [XBuilder Product](./index.zh.md) 基础上，对 User 的基本信息进行扩充如下：

* Description: 对自己的描述

### 项目 Project

在 [XBuilder Product](./index.zh.md) 基础上，对 Project 信息进行扩充如下：

* Description: 描述，对 Project 的描述
* Instructions: 游戏的操作说明
* RemixFrom: Remix 来源信息，如果当前 Project 是基于其他 Project Remix 而来，这里记录原 Project & Release 的信息
* Thumbnail: 缩略图
* 其他 Community 交互相关信息，如访问次数等

### 版本 Release

一个 Release 是 Project 某个时刻状态的快照，确定的 Release 对应于确定的、不可变更的游戏内容。

每个 Project 可以有 0 个或多个 Release。

Release 包含以下信息：

* Version: 版本号，用于标识 Release 的版本；对于同一个 Project 下的 Release，其 Version 是唯一的
* Description: 对该 Release 的描述
* Game: 游戏内容
* Thumbnail: 缩略图
* 其他，如创建时间等

某个 Release 是否可被其他用户或未登录用户读取，取决于其对应的 Project 是否公开，仅当 Project 为公开时，其 Release 可以被其他用户或未登录用户读取。

在最简单的实现方案下，Release 中的 Game 信息是对 Project 中 Game 信息的拷贝。长期来看，我们可能会在创建 Release 阶段做更多的工作，比如压缩、编译等。因此，Release 的 Game 信息实际上会包含两部分内容：

1. 源码，与 Project 中的 Game 信息一致
2. 可执行文件，基于源码生成的可执行文件

用户为自己的 Project 创建 Release，过程包括：

* 系统自动生成（或用户输入） Version & Description 信息
* 拷贝当前 Project 中的 Game、Thumbnail 作为 Release 的 Game & Thumbnail
* 使用上述信息创建 Release

### 发布 Publish

Publish 是这样的动作：

1. 如果当前 Project 不是公开的，则将其设置为公开
2. 允许用户更新当前 Project 的 Description、Instructions 等信息
3. 基于当前 Project 创建一个 Release
4. 操作者会得到 Publish 成功的提示 & Project 详情页的 URL，以便分享给他人

### 取消发布 Unpublish

Unpublish 是这样的动作：

1. 如果当前 Project 是公开的，则将其设置为非公开

### 改编 Remix

用户可以在其他人的 Project 基础上创建属于自己的 Project，并继续编辑，这个过程称为 Remix。

注意当对某个 Project 进行 Remix 操作时，总是需要指定其某一个 Release（默认是最新 Release）。当对 Project P 的一个 Release R 进行 Remix 时，我们会：

1. 为当前 User 创建一个 Project P2（非公开）
2. 将 P 的 Description、Instructions 等信息拷贝到 P2 中
3. 将 R 的 Game 信息（源码部分）拷贝到 P2 中
4. 设置 P2 的 RemixFrom 为 P & R

## User Story

### 编辑 Project

除了在 [XBuilder Product](./index.zh.md) 中提到的编辑 Project 的动作，用户还可以在编辑器中：

* Publish / Unpublish Project

### 查看他人公开 Project 主页

已登录或未登录用户可以在他人公开 Project 对应的主页：

* 查看 Project 的基本信息，如拥有者、Name、Description、Instructions、RemixFrom 等
* 查看 Release 记录，如创建时间、Version、Description 等
* 查看 Project 的 Community 交互信息
* 运行游戏，游戏内容为 Project 的最新 Release 的 Game 信息
* 分享 Project 给他人
* Like（若已登录）
* Remix Project（若已登录）

	仅当 Project 有 Release 时，Remix 操作基于的是当前 Project 的最新 Release

### 查看自己的 Project 主页

已登录用户可以在自己的 Project 主页：

* 查看 Project 的基本信息，如拥有者、Name、Description、Instructions、RemixFrom 等
* 查看 Release 记录，如创建时间、Version、Description 等
* 查看 Project 的 Community 交互信息
* 运行游戏，游戏内容为 Project 的最新 Release 的 Game 信息
* 编辑 Project 的基本信息，如 Description、Instructions 等
* 编辑 Project 游戏内容（跳转到编辑器页面）
* Unpublish Project

### 查看他人个人主页

已登录或未登录用户可以通过访问其他 User 的个人主页：

* 查看 User 的基本信息，如 Name、Description 等
* 查看 User 的公开 Project 列表
* 查看 User 的 Community 交互信息，如 Followers、Followees、Like 等
* Follow / Unfollow 该 User（若已登录）

### 查看自己的个人主页

已登录用户可以通过访问自己的个人主页：

* 查看自己的基本信息，如 Name、Description 等
* 查看自己的公开 Project 列表
* 查看自己的 Community 交互信息，如 Followers、Followees、Like 等
* 编辑自己的基本信息

### 访问 Community 首页

已登录或未登录用户可以访问 Community 首页：

* 查看推荐的公开 Project 列表（基于全网最近的 Like 信息 & Remix 信息）
* 查看关注的 User 的动态信息
