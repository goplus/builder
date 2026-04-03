# 项目类型 Project Type

## 背景

XBuilder 正在从支持单一类型 Project 的创作平台，扩展为支持多种 Project Type 的创作平台。本次设计的核心是明确 Project Type 如何作为产品的基础概念，贯穿创建、浏览、编辑、导入导出和教程等关键场景。

## 目标

* 为 Project 引入显式的 Project Type，作为基础信息的一部分。
* 在项目列表、搜索、探索、详情页、编辑器等关键场景中体现 Project Type。
* 为后续扩展更多 Project Type 预留稳定的信息结构与产品组织方式。
* 兼容存量项目与历史导入导出文件，不要求用户手动迁移。

## 非目标

* 不展开不同类型编辑器内部的具体功能设计。
* 不展开计费或额度管理方案。
* 不定义各类型的长期运营或推荐策略。

## 基本概念与规则

本部分只关注与具体 UI 形态无关的业务概念、信息关系和产品规则。

### Project

Project 是 XBuilder 中最基本的创作与管理单元。用户围绕 Project 进行创建、编辑、保存、发布、搜索、探索、分享、Remix、导入导出等操作。

一个 Project 至少包含两部分信息：

* 基础信息：如 Owner、Name、Type、可见性、创建时间、更新时间等。
* 内容：不同类型对应的具体内容结构，如游戏内容、漫画内容、机器人应用内容等。

### Project Type

Project Type 是 Project 的顶层分类，表达该 Project 属于哪一种创作类别。

Project Type 直接影响：

* 创建入口与默认模板
* 编辑器或编辑器模式的选择
* 运行时或预览方式的选择
* 创作、浏览和编辑入口的组织方式
* 导入导出文件如何恢复为正确的 Project

Project Type 不是展示标签，而是 Project 基础身份的一部分。

### 已确定与示意性的 Project Type

当前阶段已确定的 Project Type 为 `game`，对应已有的 spx 项目。

为说明多类型机制，本文引入两个示意类型：`comic` 和 `robot-app`。它们仅用于讨论信息结构、页面组织和用户路径，不代表已确定的落地方向。

三个类型说明如下：

* `game`：已确定类型，对用户显示为“游戏/Game”。对应 Builder 已较成熟的游戏创作能力，也是历史项目的默认兼容类型。
* `comic`：示意类型，对用户显示为“漫画/Comic”。以漫画、分镜、视觉叙事为核心的创作类别。
* `robot-app`：示意类型，对用户显示为“机器人应用/Robot App”。面向机器人或实体设备交互的应用类别。

### Project 标识规则

Project 由 Owner 与 Name 共同标识。Project Type 是基础属性之一，但不改变 Name 的唯一性规则。

规则如下：

* 同一 Owner 下，Project Name 跨类型全局唯一。即不允许同一用户同时拥有同名的不同类型项目（例如 `alice/hello` 的 `game` 项目和 `alice/hello` 的其他类型项目不能共存）。
* Project Type 在创建后不可变更。

### 账号与全局状态

不按 Project Type 拆分账号体系。用户使用同一账号进入 XBuilder，在同一账号下管理所有类型的 Project。

具体而言：

* 用户身份全局统一，不按 Project Type 分设账号。
* 个人主页、个人资料、关注关系、Like 等行为跨类型统一。

统一账号体系带来的跨类型计费与额度管理问题不在本文档中展开。

### Tutorial 与 Project Type 的关系

Tutorial 系统保持统一，不按 Project Type 拆分为独立产品线。

一个 Course 或 Course Series 可以与某类 Project Type 相关，也可以类型无关。例如：

* "做一个平台跳跃游戏"面向 `game`
* "画一个四格漫画"面向 `comic`
* "让机器人沿线巡逻"面向 `robot-app`
* "认识 Builder 首页"与具体类型无关

因此：

* `Course Series` 与 `Course` 不记录 Project Type 信息。
* 课程与类型的关联体现在课程设计语义与所引用的样例 Project 上，而非数据建模层面的强关联。

### XBP

XBP 是 XBuilder 的项目文件格式，用于本地导入导出 Project。

在多类型设计下，XBP 定义为类型无关的统一项目包格式：

* 所有 Project Type 均可导出为 `.xbp`。
* XBP 作为外层容器保持统一，不同 Project Type 在其内部可拥有不同的内容结构。
* XBP 元数据中必须包含 Project Type，以便导入时选择正确的处理逻辑。

### Copilot 与 Project Type 的关系

Copilot 应跟随 Builder 支持的 Project Type 一同扩展，而非仅服务于单一类型。

具体而言：

* Copilot 应支持所有已支持 Project Type 对应的界面与工作流，包括不同类型的编辑器及相关交互。
* Copilot 需能按需加载不同 Project Type 的领域知识与工具。

### Asset Library 与 Project Type 的关系

Asset Library 是 XBuilder 的统一资源复用机制，不按 Project Type 拆分。

约定如下：

* 各 Project Type 共用同一套 Asset Library 机制。
* 不同 Project Type 可复用的 Asset Type 可能不同。
* 不同 Project Type 不要求共享同一批 asset 数据；是否共享取决于它们能否消费相同的 Asset Type。
* Asset Library 能力层保持统一；所承载的 asset 数据按各 Project Type 可消费的 Asset Type 组织。

### 兼容性规则

为保证向后兼容，明确以下原则：

* 历史上无显式 Project Type 的 Project，默认视为 `game`。
* 历史 `.xbp` 文件若缺少 Project Type，默认按 `game` 处理。
* 系统遇到当前版本不支持的类型时，应明确提示用户，而非静默失败。

## User stories

本部分关注用户如何在具体页面与交互流程中感知和使用多类型 Project。

所有展示 Project 列表的场景（首页、个人项目页、喜欢页、搜索结果、打开项目模态框等）均应通过 Badge、Icon 或文案标识项目类型，且类型信息应在用户做出点击决策前可见。

### 查看首页

首页作为跨类型总入口，不按类型拆分。承担两类作用：

* 帮助用户快速继续创作、管理项目。
* 帮助用户发现不同类型的公开内容，进入对应的 Explore 页面。

多类型方案下，首页按 Project Type 分设展示区块，每个区块作为对应类型的探索入口。当前版本中可类比为“The community is liking”和“The community is remixing”等内容区块，后续再进一步按类型组织。

区块的主要作用是引导用户进入对应类型的 Explore 页面（如 `/explore/game`），而非在首页内完成深度浏览。

### 新建项目

用户发起“新建项目”时，须先选择目标 Type。该场景继续使用当前的创建模态框，沿用导航栏的“新建项目”入口，不引入新路由。

用户点击“新建项目”后，先在模态框中选择 Project Type，再填写项目名等信息。创建完成后直接进入该类型对应的编辑器。

### 浏览用户相关项目

查看某用户的项目列表或喜欢的项目时，默认展示全部类型，并提供 Type Filter。Type 通过 URL query 参数表达，无 `type` 参数时表示全部类型。例如：

* 个人项目：`/user/<user>/projects?type=game`
* 喜欢的项目：`/user/<user>/likes?type=game`

### 搜索项目

搜索为跨类型聚合场景，通过 query 参数筛选。无 `type` 参数时返回全部类型的匹配结果，并提供 Type Filter。例如：

* `/search?q=platform&type=game`

### 打开项目

“打开项目”保持为模态框，默认展示用户全部类型的 Project，并提供 Type Filter。

用户选择项目后，系统根据该 Project 的实际类型决定跳转目标，而非依据当前页面上下文。

### 探索某一类项目

Explore 是按类型区分的发现页，Type 体现在 URL path 中：

* `/explore/game`

每个 Project Type 有独立的 Explore 入口。与首页、搜索等跨类型聚合场景不同，Explore 专注于单一类型的内容发现。

不同类型的 Explore 可采用不同的内容组织、推荐维度和视觉布局。例如：

* `game`：强调可玩性、题材、互动体验。
* `comic`：强调画面、叙事、风格与主题。
* `robot-app`：强调设备能力、应用场景、控制逻辑。

### 查看项目详情

详情页应明确体现 Project 的类型，并展示与之匹配的内容结构。

路由将 Type 置于 path 中：

* `/<type>/<user>/<name>`
* 例如：`/game/alice/hello`

页面根据 type 进入对应的渲染逻辑。详情页保留统一骨架（标题区、作者信息、基础操作区等），同时允许不同类型注入差异化模块。

### 打开并编辑项目

编辑器根据 Project Type 进入对应的编辑环境。路由形式：

* `/<type>/<user>/<name>/edit`
* 例如：`/game/alice/hello/edit`

系统根据路由中的 type 选择编辑逻辑。从项目列表、打开项目模态框、详情页等入口进入编辑器时，跳转目标均由 Project 的实际类型决定。

### 导入或导出项目

导出时，所有类型统一导出为 `.xbp`。导入时，系统根据文件中记录的 Project Type 恢复对应的 Project。

若导入文件的类型与当前上下文不一致，系统应提示用户或引导进入正确的类型上下文，而非静默失败。
