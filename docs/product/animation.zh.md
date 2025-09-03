# 动画 Animation

在 Builder 中，我们允许用户轻松地添加并使用动画，让游戏角色更真实、生动。

“动画”与“业务状态的变化”这两个概念容易被混淆：

1. 在发生状态变化时，我们往往希望有“过渡动画”（让状态变化在视觉上更自然）

	但播放动画并不代表有业务状态发生变化；比如当一个人物原地不动时，也可以通过呼吸起伏的动画来让这个人物显得更有生气；同样，当一个人物受到攻击时，被打击的动画未必对应于这个人物某个状态的变更。

2. 如果我们在业务层面细粒度地定义状态，通过快速的多次状态变更，可以在业务层模拟出动画的效果

	这是在当前 Builder 及大部分类似产品（如 Scratch）中，实现动画的做法（定义 Costume 并通过代码快速切换 Costume）。但这会导致纯视觉表现上的逻辑与业务逻辑混杂在一起，除非这里细粒度的状态本身就是用户在业务上希望关心的，否则这种做法会给用户带来不必要的负担，也是我们希望避免的。

因此我们这里说的 Animation 的概念，是撇除常见的业务逻辑后，仅在视觉效果上有意义的视觉变化。以人物跑动为例，跑动对应的视觉变化往往可以拆分为两个部分：

1. 跑动对应的位置变化
2. 跑动过程中的姿态变化

一般来说 1 是业务逻辑会关心的，具体位置信息也适合由用户的业务代码来维护，这个信息往往会影响游戏的后续进程或结果；而 2 往往不是业务代码会希望关心的，由 Builder 对这类视觉变化的逻辑进行抽象，即 Animation 概念，可以降低用户实现“生动的跑动”的成本。

一般来说复杂的视觉变化伴随 Sprite 发生，因此这里的 Animation 也只针对 Sprite，而不考虑 Stage（Backdrop）。

## 基本概念

* 动画 Animation
* 造型组动画 Costume-group Animation
* 骨骼动画 Skeletal Animation
* 精灵 Sprite
* 动画绑定 Animation Binding

### 动画 Animation

Animation 是对那些细节不被业务代码关心的视觉变化逻辑的抽象。基于实现方式不同，分为两类：

* 造型组动画 Costume-group Animation
* 骨骼动画 Skeletal Animation

Animation 的基本信息包括：

* Name: 名字，在所属的 Sprite 中唯一
* Duration:（播放一遍的）时长，调整时长不会对动画进行裁剪，而是对动画播放速度（帧率）进行调整
* Sound:（可选的）关联声音信息，在 Animation 每次开始时播放；若 Animation 循环播放，则 Sound 以相同的周期循环播放；Sound 的播放速度固定，不受 Animation Duration 影响

### 造型组动画 Costume-group Animation

从技术实现角度即逐帧（Frame-by-frame）动画；除 Animation 的基本信息外，一个 Costume-group Animation 还包含以下信息：

* Costumes: 造型列表，每个造型对应一个动画帧，基于 Costume 数量 & Duration 可以确定帧率（Fps）

### 骨骼动画 Skeletal Animation

除 Animation 的基本信息外，一个 Skeletal Animation 还包含以下信息：

* Frames: 帧列表

### 精灵 Sprite

在 [XBuilder Product](./index.zh.md) 基础上，对 Sprite 进行扩充如下：

* Model: 模型信息，包括 Skeleton、Mesh 等；不是每个 Sprite 都拥有 Model 信息，只有拥有 Model 信息的 Sprite 才可以被添加 Skeletal Animation
* Animations: Animation 列表，一个 Sprite 可以包含 0 个或多个 Animation；列表中的项可能是 Costume-group Animation，也可能是 Skeletal Animation

相比 Costumes，Model 是对 Sprite 外观更为结构化的定义方式，对动作迁移、动画自动生成更友好；对应地，对 Model 的编辑会更为困难，用户自己获得相关素材的难度也更高。

我们的整体策略是：支持以 Costumes（& Costume-group Animation）作为定义 Sprite 外观的基础手段，用户可以充分利用他已有的或从别的渠道获得的素材；此外支持以 Model（& Skeletal Animation）作为定义 Sprite 外观的进阶手段，从而

1. 在 Builder 中提供更为丰富且强大的生成能力
2. 在游戏中获得更好的视觉效果

因此我们后面会提供基于 Costumes 自动解析 & 生成 Model 的能力，当这样的能力足够成熟后，所有的 Sprite 都会默认拥有 Model 信息，并可以被同时添加 Costume-group Animation & Skeletal Animation。

在此之前，部分 Sprite（如用户通过选择本地图片文件创建）不含 Model 信息，因此不能被添加 Skeletal Animation。不论一个 Sprite 是否包含 Model 信息，它的绝大部分逻辑与操作是一致的，用户只在少数情况下（如添加 Animation 时）需要注意这一点差异，同时 Builder 会对应地提供不同的交互界面协助用户正确地进行操作。

### 动画绑定 Animation Binding

除了在 Sprite 代码中命令式地调用 `animate <name>` 来播放动画外，用户可以通过将某个 Animation 绑定到特定的状态上来使其在恰当的时候自动播放；目前支持绑定的“特定状态”包括：

* 行走，通过 `step` 等 spx 方法触发位移时自动播放绑定的动画
* 死亡，通过 `die` 等 spx 方法触发精灵死亡时自动播放绑定的动画
* 默认，将某动画绑定到默认状态后，若 Sprite 不处在其他特定状态下，且不在播放其他动画，则自动循环播放该动画
* ~~转向，通过 `turn` 等 spx 方法触发方向变更时自动播放绑定的动画~~
* ~~滑行，通过 `glide` 等 spx 方法触发位移时自动播放绑定的动画~~

## User Story

### 添加 Sprite

Sprite 可以通过如下来源得到：

1. 从素材库选择已有的 Sprite，Sprite 素材库中的 Sprite 可能包含 Model 信息也可能不包含

2. 基于本地图片创建

	用户可以通过选择本地图片创建 Sprite 并添加到当前 Project 中，文件选择支持多选

	我们会提供对文件进行预处理的能力，可能包括但不限于：

	* 对 Sprite Sheet、gif 等进行分割
	* 图像去背景

	用户基于本地图片创建的 Sprite 默认没有 Model 信息；用户可以通过 Builder 提供的能力解析已有 Sprite 中的图像（可能需要用户辅助）& 生成 Model 信息，细节 TODO

3. 通过用户提供的语义文本（以及其他可能的辅助信息）生成 Model & 默认 Costume，得到 Sprite

	细节 TODO

### 向 Sprite 添加 Costume

用户可以通过选择本地图片创建 Costume 并添加到当前 Sprite 中，逻辑（包括文件预处理等）与上述直接基于本地图片创建 Sprite 时添加 Costume 的逻辑一致

### 向 Sprite 添加 Costume-group Animation

对于 Sprite，通过选择其中的一个或多个 Costume，用户可以将它们合并为一个 Costume-group Animation 添加到当前 Sprite 中；被合并到 Animation 中的 Costume 不再出现在 Sprite 的 Costume 列表中

创建 Animation 时（或创建完成后），用户可以指定其 Name、Duration、Sound 等信息，也可以将其绑定到特定状态

### 向 Sprite 添加 Skeletal Animation

拥有 Model 信息的 Sprite 才可以添加 Skeletal Animation；对于没有 Model 信息的 Sprite，视能力的成熟度我们以恰当的方式引导用户基于已有的 Costumes（& Costume-group Animation）信息解析 & 生成 Model 信息，然后再继续添加 Skeletal Animation。

Skeletal Animation 有如下几个来源：

* 将系统预置的常见动作绑定到当前 Sprite
* 用户上传或通过摄像头录制视频，系统基于视频提取动作

	细节 TODO

* 通过用户提供的语义文本（以及其他可能的辅助信息）生成 Animation

	细节 TODO

与 Costume-group Animation 类似，创建 Animation 时（或创建完成后），用户可以调整其 Name、Duration、Sound 等信息，也可以将其绑定到特定状态

### 在游戏中使用（播放）动画

在游戏中，播放 Costume-group Animation 或 Skeletal Animation 的做法相同，有两个方式：

1. 通过代码（`animate <name>`）播放指定名字的 Animation
2. 将 Animation 绑定到特定状态——当特定状态触发时，指定 Animation 被自动播放
