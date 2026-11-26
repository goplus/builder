# XBuilder

XBuilder 是一个编辑器，编辑的对象是游戏项目。游戏基于 spx 技术实现，spx 是基于 XGo 语言的游戏引擎。

XBuilder 的目标用户是学习编程的 10 岁左右未成年人。

## 基本概念

XBuilder 中的基本概念有：

* 用户 User
* 项目 Project
* 舞台 Stage
* 精灵 Sprite
* 造型 Costume
* 声音 Sound
* 背景 Backdrop
* 素材 Asset

### 用户 User

User 包含以下信息：

* Name: 可读的、全局唯一的标识，如“alice”；Name 信息不可变更

一个 User 可以拥有 0 个或多个 Project & Asset。Project & Asset 在云端的的添加操作都需要以某个用户身份进行，我们称该 User 拥有这些 Project & Asset。

目前，User 与 Project 或 Asset 的拥有关系不可变更。

### 项目 Project

Project 包含两部分信息：

1. Project 的基本信息
2. Game: Project 所对应的游戏内容

其中基本信息包括：

* Name: Project 的名字，它是 Project 在当前 User 下唯一的标识，如“my-test-game”，Name 信息不可变更
* IsPublic: Project 被保存到云端后，可以选择是否公开；公开的 Project 可以被其他人读取
* 其他，如创建时间、更新时间等

此外，Project 所对应的游戏内容 Game 包括：

* Stage: 舞台信息，游戏运行时全局的状态、逻辑、背景等信息包含在 Stage 中；一个 Project 对应一个 Stage
* Sprites: 精灵列表，一个 Project 可以对应 0 个或多个 Sprite
* Sounds: 声音列表，一个 Project 可以对应 0 个或多个 Sound
* Zorder: Z 轴顺序，记录了当前 Project 中所有的 Sprite（以及其他特殊内容）的在 Z 轴的顺序，即渲染时的层级
* Config: 其他配置信息，如摄像头（Camera）行为等

一个 Project 对应一个可运行的游戏，它可以看成是 0 个或多个 Sprite 在一个 Stage 上按脚本“表演”的结果，而 Sound 可以被同 Project 中的 Stage 或 Sprite 在表演时使用（播放）

因为 User Name 是全局唯一的，而 Project Name 是当前 User 下唯一的，因此一个 Project 可以被 User Name + Project Name 唯一标识。如我们可以用 `alice/my-test-game` 来标识 User `alice` 所拥有的名为 `my-test-game` 的 Project。

### 舞台 Stage

Stage 包含以下信息：

* Script: 脚本，对 Stage 运行逻辑的描述
* Backdrops: 背景列表，一个 Stage 可以对应 0 个或多个 Backdrop
* Config: 其他配置信息，如默认 Backdrop 的选用、舞台尺寸等

### 精灵 Sprite

Sprite 包含以下信息：

* Name: 名字，在所属的 Project 中唯一
* Script: 脚本，对 Sprite 运行逻辑的描述
* Costumes: 造型列表，一个 Sprite 可以对应一个或多个 Costume
* Config: 其他配置信息，如默认 Costume 的选用、初始位置、方向、尺寸、可见状态等

### 造型 Costume

Costume 包含以下信息：

* Name: 名字，在所属的 Sprite 中唯一
* Image: 图片，一个 Costume 对应一张图片
* Config: 其他配置信息，如相对位置、分辨率等

### 声音 Sound

Sound 包含以下信息：

* Name: 名字，在所属的 Project 中唯一
* Audio: 音频，一个 Sound 对应一份音频文件

### 背景 Backdrop

Backdrop 包含以下信息：

* Name: 名字，在所属的 Project 中唯一
* Image: 图片，一个 Backdrop 对应一张图片
* Config: 其他配置信息，如相对位置、分辨率等

### 素材 Asset

素材是对 Project 中独立发布的可复用内容的统称，内容的格式有多种，如 Sprite、Sound、Backdrop 等。用户在创作游戏的过程中，可以把这些相对零碎的可复用的内容独立发布，以允许自己在别的 Project、或别人在别的 Project 复用之。

Asset 包含以下信息：

* DisplayName: 展示名，对 Asset 的简单描述，不同 Asset 的 DisplayName 可以相同
* Content: 内容，可能是一个 Sprite，或者一个 Sound，或者一个 Backdrop
* AssetType: 内容格式，标识素材所包含的内容是 Sprite、Sound、Backdrop 中的哪种
* Category: 种类，对于素材使用场景的简单分类，如 food、animals、sports 等，方便用户根据使用场景进行筛选
* IsPublic: Asset 被保存到云端后，可以选择是否公开；公开的 Asset 可以被其他人读取并使用
* ClickCount: 热度，反映一个 Asset（尤其是公开 Asset）的受欢迎程度

## User Story

这里简述 XBuilder 几个基本用户场景对应的逻辑：

### Project 创建与保存

用户通过 XBuilder 可以创建新 Project，然后进行编辑：

* 编辑 Project Name
* 编辑 Stage 信息
	- 编写全局 Script（细节 TODO）
	- 添加并编辑 Backdrop 信息
		+ 设置 Backdrop Name
		+ 上传 Image
		+ 修改其他 Backdrop Config（细节 TODO）
	- 修改其他 Stage Config（细节 TODO）
* 添加并编辑 Sprite
	- 设置 Sprite Name
	- 编写 Sprite Script（细节 TODO）
	- 添加并编辑 Costume 信息
		+ 设置 Costume Name
		+ 上传 Image
		+ 修改其他 Costume Config（细节 TODO）
	- 修改其他 Sprite Config（细节 TODO）
* 添加并编辑 Sound
	- 设置 Sound Name
	- 上传或录制 Audio（细节 TODO）
* 对 Zorder 进行控制（控制不同内容的层级）

编辑过程中用户应当能从预览区得到反馈，实时地看到当前舞台上所有的内容（按照 Zorder 展示）。

编辑过程中用户可以选择运行 Project。运行 Project 即为在浏览器中运行 Project 对应的游戏（基于当前 Project 中的 Game 内容）。

编辑过程中或完成后，用户可以选择保存 Project，把当前的 Project 状态保存到云端。后续提到的“保存”，如非特别说明，均指保存到云端。

对于尚未保存到云端的变更，编辑器会将其暂存在用户浏览器中。即，如果用户做了变更 A，且未将其保存到云端，随后关闭了编辑器。再次使用编辑器打开该 Project 时，变更 A 不会被丢弃，用户可以继续在 A 的基础上继续编辑。这个暂存是可能失效的，失效的原因包括但不限于：

* 间隔时间过长
* 本地存储空间不足
* 中途切换用户身份或编辑别的 Project

被保存的 Project 可以是公开的，也可以是私有的，具体参见 `Project.IsPublic`。

### 编辑已有 Project

用户可以查看自己已保存的所有 Project，并再次编辑，即，在当前编辑器中恢复当时保存的状态。

对已有 Project 的编辑动作与创建新 Project 后的编辑类似，这里不做赘述。

在保存时，本次做的变更应当被追加到云端已有的 Project 上，而不会在云端产生新的 Project。

### 在其他人的公开 Project 基础上编辑

详见 [社区 Community](./community.zh.md) 中的“改编 Remix”。

### 导入、导出 Project

用户可以通过编辑器将 Project 中的 Game 导出为一个文件并保存到用户本地。注意 Project 中除 Game 外的其他信息不会被包含在导出文件中。

当用户正在编辑某个 Project 时，用户也可以在编辑器中选择导入文件，这个文件应当是自己或者别人之前通过编辑器的“导出”得到的。导入文件会将文件对应的 Game 信息恢复到当前正在编辑的 Project 中。因此对于当前正在编辑的 Project，其 Game 信息会被完全替换，而其他信息会被保留。如果我们进行保存操作，则会保存到原本正在编辑的那个 Project，而不会产生新的 Project。

如果用户执行导入行为时，并没有在编辑某个已存在的 Project。我们应当先在编辑器中创建一个新的 Project，接着执行上述的“恢复 Game 信息”的过程。

### 保存 Asset

用户在编辑 Project时，可以选择将当前 Project 中的某个 Asset 保存到素材库。在保存时，用户有机会指定 DisplayName、Category、IsPublic 等信息。

与 Project 类似，公开的 Asset 可以被其他人看到并读取。

### 使用已保存的 Asset

用户可以查看并筛选所有人保存的公开 Asset，将其添加到当前 Project 中，并继续编辑。

与 Project 类似，当用户添加其他人的公开 Asset 到 Project 中并进行了后续编辑时，他并不会修改那份原始的其他人保存的 Asset。当用户添加自己的 Asset 到 Project 中并进行了后续编辑时，他同样不会修改那份原始的自己保存的 Asset。

如果他将修改后的结果重新保存到素材库，这将在云端创建一份新的 Asset。

因此素材库中的 Asset 是不会被修改的，只会被创建或删除。

### 未登录状态编辑

暂不支持未登录用户通过编辑器进行操作；在尝试使用编辑器做任何 Project 操作之前，应当先登录

### 离线状态编辑

在离线状态下，编辑器部分可用，具体行为细节包括：

* 如果用户当前正在编辑某个 Project（这个 Project 可能已经添加到云端，可能还没有），用户可以继续编辑
* 用户无法将当前编辑的 Project 保存（到云端）
* 离线状态下的变更也会暂存在用户浏览器中，逻辑与在线状态下的暂存逻辑一致
* 用户无法查看自己或公开的 Project 列表，因此也无法从中选择并作为继续编辑的基础
* 用户无法查看自己或公开的 Asset 列表，因此也无法从中选择并导入 Project
* 关于用户身份
	- 如果此前未登录，用户无法在离线状态下进行登录
	- 如果此前已登录，且登录状态未过期，则继续使用该登录状态对应的身份

### 从 Scratch 项目导入 Asset

用户可以在 XBuilder 编辑器中选择导入一个 Scratch 项目文件（这个文件来自于 Scratch 编辑器的导出功能）。XBuilder 编辑器会解析并列出其中所有的 Asset，用户可以选择并导入到当前 Project 中。

后续对于 Asset 的编辑与普通的编辑相同，这里不做赘述。

### 分享

详见 [社区 Community](./community.zh.md)。

### 嵌入到第三方站点

TODO
