# 素材生成

我们通过 AIGC 技术为用户提供高质量的素材，解决用户在创作过程中遇到的素材匮乏问题。

我们与常规的素材生成平台的一个重要区别是：我们的产物不是“通用的素材”，如图片、音频等，而是 XBuilder 平台上的 [Asset](./index.zh.md#素材-asset)。这要求我们替用户去解决例如角色一致性、风格统一等常见问题，也允许我们更少暴露基础的能力，转而提供更易用、更适配 XBuilder 使用过程的功能。

例如：

* 我们倾向于生成并维护含 Costume、Animation 的 Game Character，而不是要求用户自己去为某个精灵分别生成图片
* 我们倾向于生成含 Sound 的 Animation，而不是将动画帧与配音拆分为不同的工作流
* 我们倾向于尽可能利用生成素材时的 Project 上下文信息；如在一个 Pixel Art 风格的游戏，我们为它生成 Backdrop 时，应当默认会遵循该风格。

## 功能

我们计划提供以下几类 AI 素材生成功能（按优先级排序）：

* Sprite、Animation、Costume 生成
* Backdrop 生成
* Sound 生成
* Map（含 tilemap）生成

### Sprite 生成

基于已有的 Project 生成完整的 Sprite（不含代码），可细分为

* 角色（Character Sprite），会基于 Animation & Costume 生成的能力
* 道具（Prop Sprite）
* 其他

### Costume 生成

基于已有的 Sprite 生成新的 Costume

### Animation 生成

基于已有的 Sprite 生成新的 Animation

### Backdrop 生成

基于已有的 Project 生成新的 Backdrop

### Sound 生成

细分为

* 语音合成（Text-to-Speech）
* 音效（Sound Effect）
* 背景音乐（Background Music）

### Map（含 tilemap）生成

低优先级，前置条件是 XBuilder 对用户暴露 Map 的概念。

## 概念定义

这次涉及到的概念有

* 视角 Perspective
* 美术风格 Art Style
* 项目设定 Project Setting
* 素材设定 Asset Setting
* 素材生成 Asset Generation

### 视角 Perspective

Perspective 描述了素材中角色或物体的观察角度，常见的视角有：

* 俯视 Top-down
* 侧俯视 Side-top-down
* 等距 Isometric
* 侧视 Side-scrolling

等

Perspective 不仅会影响生成的素材的图像内容，也可能会影响素材的结构。例如，侧俯视视角的 Character Sprite 可能需要更多的行走方向（如 4 或 8 个），而俯视或侧视视角的 Character Sprite 则只需要一个方向。

### 美术风格 Art Style

Art Style 描述了素材的视觉表现特征，常见的美术风格有：

* 像素风 Pixel Art
* 手绘风 Hand-drawn
* 低模 Low-poly
* 写实 Realistic

等

在一个 Project 中，不同的素材通常遵循相同或相似的 Art Style，以保证整体视觉的一致性和协调性。

### 项目设定 Project Setting

Project Setting 描述了当前 Project 的整体特征，包括但不限于以下信息：

* Perspective
* Art Style
* （游戏）类型、背景描述等

我们会提供入口并鼓励用户为自己的 Project 设定这些信息。我们也可以通过项目内容自动推断这些信息作为缺省值。

### 素材设定 Asset Setting

Asset Setting 是对 Asset 语义化的描述，它可以是生成 Asset 时的需求，也是作为结果的 Asset 信息的一部分。

Asset Setting 大概包括这些信息：

* Type，如 Character Sprite、Prop Sprite 等
* Perspective、Art Style 等
* 其他，如角色的身份、年龄性别，或道具的外观细节描述等

原则上基于相同的 Asset Setting，我们可以多次生成几乎一致的 Asset。通过对 Asset Setting 进行调整后再次生成，可以得到风格或内容上承继又有所差异的 Asset。

子 Asset（如 Costume、Animation 等）可以通过继承父 Asset 的 Asset Setting 来保持与其他子 Asset 的一致性。

两个 Asset 的 Asset Setting 越接近，它们在风格和内容上也应当越接近，因此我们可以通过比较 Asset Setting 来判断 Asset 之间的相似度，从而决定是否将某个 Asset 推荐给用户使用，或在检索 Public Asset Library 时进行匹配。

对于非 AI 生成的 Asset，我们也可以通过为其补充一个“推测的” Asset Setting，从而使其能够参与到上述的推荐与检索过程中来。

### 素材生成 Asset Generation

Asset Generation 是指基于某份 Asset Setting，生成对应 Asset 的过程。

因为素材生成通常是一个复杂且耗时的过程，因此我们需要对 Asset Generation 进行管理，它可能包括这些信息：

* Setting，即生成该 Asset 时所用的 Asset Setting
* Status，生成的当前状态，如 Pending、In Progress、Completed、Failed 等
* Result Asset，生成成功后得到的 Asset

与目前 Copilot、AI Interaction 的使用类似，素材生成的使用是受限的。不同 Setting 可能对应不同的使用额度消耗规则。

## 关键问题

### 素材生成的成本高、速度慢，如何优化用户体验且平衡成本

尽可能通过对已有素材的检索来满足需求，对用户来说效率更高，也可以避免不必要的生成开销

因此一般的素材生成过程如下

1. 用户输入需求（包括美术风格、视角、文本描述等，部分可以从 Project 上下文中获取）
2. 检索 Public Asset Library（将需求与 Asset 的 Setting 进行匹配）
3. 如果用户对检索结果不满意，则进行素材生成
4. 生成后的素材如被认可（采用或点赞），自动保存到 Public Asset Library

需要注意，这意味着我们需要在入口上模糊“检索素材”与“生成素材”的界限。

### 如何生成高一致性、动作连贯的 Character Sprite

具体的过程如下

1. 基于用户输入生成 Sprite Setting
2. 基于 Setting 生成 Default Costume
3. 基于 Setting 生成 Animation Setting 列表
4. 基于每个 Animation Setting 生成 Animation
	1. 基于 Animation Setting 生成首尾帧
	2. 通过视频生成模型，基于首尾帧生成（可能含配音的）动画视频
	3. 基于视频截帧构造 Costume-group Animation & 绑定的 Sound

## 技术风险

### 生成结果对输入的匹配程度不稳定

如 Perspective、Animation 描述等不一定能得到理想的结果

### 视频生成成本高

SOTA 视频生成模型（如 Veo 3.1）价格在 ¥ 1/秒 左右，最低分辨率 720p，最短时长 5s，这对于游戏中短动画的生成来说成本过高

考虑

* 调研更低分辨率、更短时长的视频生成模型
* 多个 Animation 合并到一个视频生成请求
