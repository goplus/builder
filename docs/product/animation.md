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

一般来说 1 是业务逻辑会关心的，具体位置信息也适合由用户的业务代码来维护，这个信息往往会影响游戏的后续进程或结果；而 2 往往不是业务代码会希望关心的，对这类视觉变化的逻辑进行抽象，即 Animation 概念，可以简化用户实现“生动的跑动”的成本。

一般来说复杂的视觉变化伴随精灵（Sprite）发生，因此 Animation 也只针对 Sprite。

## 基本概念

* 动画 Animation
* 精灵 Sprite
* 图像精灵 Image Sprite
* 骨骼精灵 Skeletal Sprite
* 逐帧动画 Frame-by-frame Animation
* 骨骼动画 Skeletal Animation
* 动画绑定 Animation Binding

### 动画 Animation

Animation 是对常见的业务代码不关心细节的视觉变化逻辑的抽象。基于实现方式不同，分为两类：

* 逐帧动画 Frame-by-frame Animation
* 骨骼动画 Skeletal Animation

Animation 的基本信息包括：

* Name: 名字，在所属的 Sprite 中唯一
* Duration:（播放一遍的）时长，调整时长不会对动画进行裁剪，而是对动画播放速度（帧率）进行调整
* Sound:（可选的）关联声音信息，在 Animation 每次开始时播放；若 Animation 循环播放，则 Sound 以相同的周期循环播放；Sound 的播放速度固定，不受 Animation Duration 影响

### 精灵 Sprite

对应于动画类型的不同，将 Sprite 分为两类：

* 图像精灵 Image Sprite
* 骨骼精灵 Skeletal Sprite

Sprite 的基本信息包括：

* Name: 名字，在所属的 Project 中唯一
* Script: 脚本，对 Sprite 运行逻辑的描述
* Config: 其他配置信息，如初始位置、方向、尺寸、可见状态等

除基本信息外，两类精灵各自包含一些特有的信息（后文详述），主要表现为外观的定义形式不同。

Image Sprite 的外观由一系列的图像（Costume）定义，每个图像对应一帧。对 Image Sprite 外观信息的编辑相对简单，用户往往容易从外部获得用于创建 Image Sprite 的原始素材（如普通图片或 Sprite Sheet）。

Skeletal Sprite 的外观是由更为结构化的模型信息定义的，因此它对动作迁移、动画自动生成更友好，而对应地，其外观信息的编辑会更为困难，用户自己获得这类素材的难度也更高。

我们的整体策略是：支持 Image Sprite 从而让用户可以充分利用他已有的或从别的渠道获得的素材，支持 Skeletal Sprite 从而

1. 在 Builder 中提供更为丰富且强大的生成能力
2. 在游戏中获得更好的视觉效果与运行性能

因此我们后期的主要能力会围绕 Skeletal Sprite 构建，但对 Image Sprite 会长期支持；此外我们会提供将 Image Sprite 自动转换为 Skeletal Sprite 的功能，当转换能力足够成熟后，用户将不再有机会接触到 Image Sprite，他们通过图片或 Sprite Sheet 之类的素材创建的 Image Sprite 会直接被转换为 Skeletal Sprite。

在二者共存期间，大部分情况下用户不需要细致地区分两类 Sprite，它们的绝大部分逻辑与操作是一致的，在有区别的地方 Builder 会通过不同的交互界面协助用户正确地进行操作。

### 图像精灵 Image Sprite

除基本信息外，Image Sprite 包含以下信息：

* Costumes: 造型列表，一个 Sprite 可以包含一个或多个 Costume
* Animations: Frame-by-frame Animation 列表，一个 Sprite 可以包含 0 个或多个 Frame-by-frame Animation
* Config: 除基本信息中本来的配置信息外，还包含默认 Costume / Animation 的选用等其他配置

### 骨骼精灵 Skeletal Sprite

除基本信息外，Skeletal Sprite 包含以下信息：

* Model: 模型信息，包括 Skeleton、Mesh 等
* Animations: Skeletal Animation 列表，一个 Sprite 可以包含 0 个或多个 Skeletal Animation
* Config: 除基本信息中本来的配置信息外，还包含默认 Animation 的选用等其他 Animation 相关配置

### 逐帧动画 Frame-by-frame Animation

除 Animation 的基本信息外，一个 Frame-by-frame Animation 还包含以下信息：

* Costumes: 造型列表，每个造型对应一个动画帧，基于 Costume 数量 & Duration 可以确定帧率（Fps）

### 骨骼动画 Skeletal Animation

除 Animation 的基本信息外，一个 Skeletal Animation 还包含以下信息：

* Frames: 帧列表

### 动画绑定 Animation Binding

除了在 Sprite 代码中命令式地调用 `animate <name>` 来播放动画外，用户可以通过将某个 Animation 绑定到特定的状态上来使其在恰当的时候自动播放；目前支持绑定的“特定状态”包括：

* 行走，通过 spx `step` 等方法触发位移时自动播放绑定的动画
* 死亡，通过 spx `die` 等方法触发精灵死亡时自动播放绑定的动画
* 默认，将某动画绑定到默认状态后，若 Sprite 不处在其他特定状态下，且不在播放其他动画，则自动循环播放该动画
* ~~转向，通过 spx `turn` 等方法触发方向变更时自动播放绑定的动画~~
* ~~滑行，通过 spx `glide` 等方法触发位移时自动播放绑定的动画~~

## User Story

### 添加 Image Sprite

Image Sprite 可以通过如下来源得到：

1. 从素材库选择已有的 Image Sprite
2. 基于本地图片创建

	用户可以通过选择本地图片创建 Image Sprite 并添加到当前 Project 中，文件选择支持多选

	每张图片可以包含一个或多个造型图像（以 Sprite Sheet 的形式），Builder 会尝试去识别并分割其中包含的所有造型图像，并将所有文件包含的所有造型图像都作为 Costume 添加到新构造的 Sprite 中

	在 Costume 添加过程中，支持进一步对图片进行处理，比如去背景

### 向 Image Sprite 添加 Costume

用户可以通过选择本地图片创建 Costume 并添加到当前 Image Sprite 中，逻辑（包括识别并分割 & 去背景等处理逻辑）与上述直接基于本地图片创建 Image Sprite 时添加 Costume 的逻辑一致

### 向 Image Sprite 添加 Frame-by-frame Animation

对于 Image Sprite，通过选择其中的一个或多个 Costume，用户可以将它们合并为一个 Frame-by-frame Animation 添加到当前 Sprite 中；被合并到 Animation 中的 Costume 不再出现在 Sprite 的 Costume 列表中

创建 Animation 时（或创建完成后），用户可以指定其 Name、Duration、Sound 等信息，也可以将其绑定到特定状态

### 添加 Skeletal Sprite

Skeletal Sprite 可以通过如下来源得到：

1. 从素材库中选择已有的 Skeletal Sprite
2. 通过 Builder 提供的能力解析已有 Image Sprite 中的图像（可能需要用户辅助），提取得到 Model 信息，将其转换为 Skeletal Sprite

	细节 TODO

3. 通过用户提供的语义文本（以及其他可能的辅助信息）生成 Model，并得到 Skeletal Sprite

	细节 TODO

### 向 Skeletal Sprite 添加 Skeletal Animation

Skeletal Animation 有如下几个来源：

* 将系统预置的常见动作绑定到当前 Skeletal Sprite
* 用户上传或通过摄像头录制视频，系统基于视频提取动作

	细节 TODO

* 通过用户提供的语义文本（以及其他可能的辅助信息）生成 Animation

	细节 TODO

创建 Animation 时（或创建完成后），用户可以调整其 Name、Duration、Sound 等信息，也可以将其绑定到特定状态

### 在游戏中使用（播放）动画

在游戏中，播放 Frame-by-frame Animation 或 Skeletal Animation 的做法相同，有两个方式：

1. 通过代码（`animate <name>`）播放指定名字的 Animation
2. 将 Animation 绑定到特定状态——当特定状态触发时，指定 Animation 被自动播放
