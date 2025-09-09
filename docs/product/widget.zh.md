# 控件 Widget

游戏界面中的元素，除了 Backdrop 与 Sprite 外，还有一类特殊的元素，我们称之为控件 Widget。

Widget 所对应的界面元素不是虚拟的“游戏世界”的一部分，这表现为：

* 它们不会参与游戏行为

	Widget 不存在于“游戏世界”之中，因此不会与这个世界中的内容（Sprite 等）产生交互；如果将来我们内置物理引擎，Widget 对应的内容应当不受其影响

* 它们的定位相对于视口而不是地图

	将来支持摄像机后，Widget 对应的内容相对视口的位置或大小不受摄像机视角变化的影响

* Widget 不会被游戏世界中的内容遮挡，而是总会遮挡游戏世界中的内容

常见的 Widget 包括但不限于：

* 记分板、玩家信息、小地图（mini-map）等，将游戏中的信息展示给玩家
* 文本输入框、滑杆等，帮助玩家输入信息
* 视频、网页等，将复杂的外部内容嵌入到游戏界面中

与 Sprite 相比，用户对 Widget 的外观、行为的定制需求往往相对弱，而自己基于基本的图形绘制能力去实现又成本很高；因此我们对常见需求进行整理，实现对应的 Widget 并提供给用户选用，以一种抽象层级高、离具体需求近、可定制能力低的方式满足用户向游戏中添加这类界面元素的诉求。

## 基本概念

* 控件 Widget
* 显示器 Monitor
* 舞台 Stage

### 控件 Widget


Widget 是游戏界面中那些不属于虚拟的“游戏世界”一部分的界面元素。

基于其用途、行为的不同，Widget 可以分为不同的类别；目前我们会内置一些 Widget 类别，长远来看，我们也可能会支持由用户或第三方来实现 Widget 类别并添加到项目中使用（这个预期会很远）。

Widget 的基本信息包括：

* Name: 名字，在所属的 Project 中唯一
* Type: 类别，Builder 通过 Type 信息确定 Widget 的实现逻辑
* Basic Config: 基础配置信息，对于不同 Type 的 Widget，其 Basic Config 包含的信息结构是相同的，包括：

	- X, Y: 位置
	- Size: 大小
	- Visible: 可见状态

	需要注意，对于某些特殊的 Widget Type（比如总是全屏展示），其位置或大小可能是不可自定义的

* Advanced Config: 高级配置信息，对于不同 Type 的 Widget，其 Advanced Config 结构各不相同

	比如对用于记分板的 Widget，会需要用户通过高级配置来指定“分数”对应的变量值

### 显示器 Monitor

Monitor 是一类 Widget，其以文本的方式展示游戏中的某一份数据；在视觉上一个 Monitor 包括两部分内容：

1. Label: 标签，说明这份数据的含义
2. Value: 值，即这份数据的值

以一个记分板为例，其 Label 可能是“分数”，其 Value 则可能是某个全局变量（如 `var score int`）的值；对应地，在最终界面上，Monitor 会被渲染为类似“分数：90”这样的结果。

Monitor 的 Advanced Config 包括：

* Label: 指定 Monitor 的标签信息
* Value: 指定 Monitor 的值的来源

	目前只支持通过指定一个全局变量的名字作为值的来源；该全局变量的值会被使用作为 Monitor 的值，非字符串类型的值会被转为字符串后再用于展示

### 舞台 Stage

在 [XBuilder Product](./index.zh.md) 基础上，对 Stage 进行扩充如下：

* Widgets: Widget 列表，一个 Stage 可以包含 0 个或多个 Widget

## User Story

### 向 Stage 添加 Widget

用户可以向 Stage 中添加 Widget，添加时需要选择 Widget Type

Widget 添加完成后，用户可以调整其 Name、Basic Config、Advanced Config 等信息

### 通过代码与 Widget 交互

Stage 与 Sprite 的代码均可以通过以下接口与当前 Stage 中的 Widget 进行交互：

```go
scoreMonitor := getWidget(Monitor, "score")
usernameInput := getWidget(Input, "usernameInput")

// `show` & `setXYPos` 等是基础方法，所有类别的 Widget 都会提供
scoreMonitor.show
scoreMonitor.setXYPos 0, 0
// `onMsg` 是基础方法，但不同类别的 Widget 会触发的 msg（如这里的 `"change"`）是不同的
usernameInput.onMsg "change", value => {
	// ...
}

// `getValue` 是 `Input` 特有的方法
username := usernameInput.getValue()
```
