# Tutorial Class Framework（课程类框架）

`tools/tutorial` 是目标式课程（Playground Course）的类框架。一节目标式课程就是一段 XGo 程序 `main_course.gox`，
与一个内嵌的 SPX 项目一起运行。它向学习者交代任务，观察学习者在编辑器里做了什么，并决定何时算达成目标。框架把这些
调用转换成宿主（spx-gui 里的 Tutorial 模块）的 capability，再把宿主事件投递回课程的回调。框架运行在与具体框架无关的
[XGo Executor](../xgoexec/) 之上。

本文是写给课程作者的使用说明。事实源仍然是契约：作者侧 API 以
[`tutorial-class-framework.go`](../../docs/develop/tutorial-v2/tutorial-class-framework.go) 为准，宿主侧以
[`module_TutorialFramework.ts`](../../docs/develop/tutorial-v2/module_TutorialFramework.ts) 为准。本文与契约不一致时，
以契约为准，说明本文已经过时。

English version: [README.md](./README.md)

## 课程项目结构

| 路径 | 用途 |
| --- | --- |
| `index.json` | 框架配置。`project.type` 和 `project.root` 指明内嵌的学习者项目，`copilotContext` 是给 Copilot 的作者指令、学习者看不到，`inEditorRoute` 决定编辑器打开时的位置。 |
| `main_course.gox` | 课程程序。 |
| `project/` | 一个普通的序列化 SPX 项目。学习者上课时，它会成为一个没有 owner 的内存项目。 |
| `assets/videos/<name>/index.json` | 声明名为 `<name>` 的视频。其中的 `path` 指向视频文件，相对于该目录。课程代码只用 `<name>` 引用视频。 |

完整目录见[示例课程](../../docs/develop/tutorial-v2/example-tutorial-course/)。

## 第一节课

下面是示例课程的 `main_course.gox`：

```go
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	// TODO(#3441): "API References" is the target's Radar node name; revisit
	// once the Radar name-based selector syntax is settled.
	Spotlight.reveal "API References", "Here is stepTo, the only block you need in this lesson."
}

Editor.Runtime.onLog log => {
	if log == "reached-target" {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

课程开始时，它把 Code Editor 限制为只提供一个 API，展示任务说明，播放一段视频，并高亮 API 列表。随后课程开始等待。
Lita 碰到 Mushroom 时，学习者的项目会输出 `reached-target`（`Mushroom.spx` 里的 `println "reached-target"`），
`onLog` 回调把这个信号转成一次带生成反馈的完成。

这是最常见的写法：学习者的项目在某件事发生时输出一行约定好的日志，课程用 `Editor.Runtime.onLog` 监听它。

## 编写课程代码

### 调用约定

- 课程自身的方法直接调用，不加前缀：`showMessage "Hi"`、`complete`。
- 命名空间首字母大写，其方法首字母小写：`Editor.CodeEditor.filterAPIs`、`Copilot.generateText`、
  `Spotlight.reveal`。命名空间的各段是字段，XGo 只会自动转换方法名。
- 作为语句的调用可以用命令式写法，不带括号。要使用返回值的调用必须带括号，因为命令式调用不是表达式。
- `onXxx param => { ... }` 注册一个回调。没有载荷的回调省略参数。

```go
onStart => {
	showMessage "Hello"
	Editor.Ruler.show
	code := Editor.Project.getCode("Lita")
	echo code
}
```

### 顶层代码与课程开始

`main_course.gox` 的顶层语句在程序启动时执行一次，用来声明共享状态和注册回调。顶层语句执行完后，"课程开始"才会投递给
每个 `onStart` 回调，所以开场流程运行时，所有回调都已经注册好了。

回调里也可以注册新的回调，新回调从下一次事件开始生效。课程开始之后才注册的 `onStart` 回调不会被调用。

### 执行模型

- **同一时刻只有一个回调在运行。** 回调之间共享的变量不会发生数据竞争，课程代码不需要任何锁。
- **等待类调用会让其他回调运行。** `showPrelude`、`showMessage`、`showVideo`、`generateText` 和 `generateJSON`
  会等待学习者或等待生成结果。一个回调等待期间，其他回调照常运行，所以调用返回时，共享状态可能已经变了。
- **同一个回调不会与自己重叠。** 每个注册的回调按到达顺序逐个处理自己的触发。回调还在运行或等待时到达的触发会排队。
  因此依赖上一次触发的逻辑不需要任何防护。
- **不同的回调相互独立。** 同一事件上的多个回调（包括多个 `onStart` 回调）各自独立运行，可能在等待点交错，
  彼此之间没有顺序保证。必须按顺序发生的步骤要写在同一个回调里。
- **展示不会重叠。** `showPrelude`、`showMessage`、`showVideo` 同一时刻最多只有一个在屏幕上，其他回调请求的展示会
  排队等候。Spotlight 不属于展示：`reveal` 在高亮出现后立即返回，可以和对话框同时存在。
- **没有定时器。** 框架没有 `sleep`，也没有调度器。课程只对事件和"学习者看完了某个展示"作出反应。

```go
previous := ""
Editor.Runtime.onLog log => {
	if log == previous {
		showMessage "Same output as last time. Try changing something."
	}
	previous = log
}
```

对话框打开期间，下一条日志在队列里等待，所以它比较的是已经更新过的 `previous`。

```go
onStart => {
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	showMessage "Now try it yourself."
}
```

### 高频事件

每个回调最多排队 1024 个待处理的触发。一个回调停在等待类调用里、而它的事件还在不断触发时，队列就会被填满。例如
在 `onLog` 里打开的对话框，学习者一直不关，游戏却还在持续输出日志。队列满了之后，该事件的后续触发会被拒绝并作为
错误报告给宿主，这个事件上的所有回调都收不到它们。

不要让高频事件的常规路径上出现等待类调用。对无关的触发尽早返回，让绝大多数触发立即处理完：

```go
Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	completeWith "Lita reached Mushroom!"
}
```

### 完成

`complete` 和 `completeWith message` 会结束课程：

- 不再投递新事件，排队中尚未开始的触发会被丢弃。
- 已经在运行或等待的回调会执行到结束，包括 `complete` 之后的语句。完成后它们请求的展示会被宿主跳过。
- 然后程序退出，这次运行报告为 `completed`。
- 只有第一次 `complete` 或 `completeWith` 生效，之后的调用没有任何效果。

`completeWith` 会把消息作为反馈展示给学习者。上面第一节课就是根据学习者的代码生成这条消息的。

## API 参考

### Course

| 调用 | 何时返回 | 说明 |
| --- | --- | --- |
| `onStart => { ... }` | | 注册课程开始回调。 |
| `showPrelude message` | 学习者关闭后 | 展示开场任务说明。与 `showMessage` 的区别只在宿主的呈现方式。 |
| `showMessage message` | 学习者关闭后 | 展示对话框。 |
| `showVideo name` | 学习者看完或关闭后 | 播放已声明的视频 `name`，参数不是文件路径。 |
| `complete` | 立即 | 结束课程，不展示反馈。见[完成](#完成)。 |
| `completeWith message` | 立即 | 结束课程，并把 `message` 作为反馈展示。 |

展示从不自动推进。

### Editor.Project

读取的是学习者的项目模型，不是编辑器的界面状态。

| 调用 | 返回 | 说明 |
| --- | --- | --- |
| `Editor.Project.getCode(sprite)` | 该精灵当前的代码 | `sprite` 是精灵名，例如 `"Lita"`，不是文件名。项目里没有这个精灵时，课程会失败。 |
| `Editor.Project.listSprites()` | 精灵名列表 | 用于由学习者自己创建并命名精灵的课程。 |

```go
for sprite <- Editor.Project.listSprites() {
	echo sprite, Editor.Project.getCode(sprite)
}
```

### Editor.Runtime

观察学习者项目的运行，不是课程程序本身。

| 回调 | 何时调用 |
| --- | --- |
| `Editor.Runtime.onStart => { ... }` | 学习者的项目开始运行。 |
| `Editor.Runtime.onExit code => { ... }` | 学习者的项目退出，`code` 是退出码。退出不代表达成了目标。 |
| `Editor.Runtime.onLog log => { ... }` | 学习者的项目输出一行日志，每行一次，按输出顺序。运行时错误不走这个通道。这是判断学习者做到了什么的主要途径。 |

```go
Editor.Runtime.onStart => {
	echo "the learner's project started"
}

Editor.Runtime.onExit code => {
	echo "the learner's project exited with code", code
}
```

### Editor.CodeEditor

| 调用 | 何时返回 | 说明 |
| --- | --- | --- |
| `Editor.CodeEditor.filterAPIs apis` | 立即 | 限制 Code Editor 辅助功能提供的 API。每一项都是完整的 definition identifier：`xgo:<package>?<name>#<overloadId>`。省略 `#<overloadId>` 表示包含该名字的全部重载。不接受 `"stepTo"` 这样的简写。 |
| `Editor.CodeEditor.formatWorkspace` | 格式化完成后 | 格式化学习者的代码。 |

```go
onStart => {
	Editor.CodeEditor.filterAPIs [
		"xgo:github.com/goplus/spx/v3?Sprite.stepTo",
		"xgo:github.com/goplus/spx/v3?Sprite.say",
	]
}
```

### Editor.Ruler

| 调用 | 说明 |
| --- | --- |
| `Editor.Ruler.show` | 在舞台上显示标尺。 |
| `Editor.Ruler.hide` | 隐藏标尺。 |

```go
onStart => {
	Editor.Ruler.show
	showMessage "Look at the coordinates on the stage."
	Editor.Ruler.hide
}
```

### Copilot

课程代码发起的调用不会出现在学习者的 Copilot 对话里。

| 调用 | 返回 | 说明 |
| --- | --- | --- |
| `Copilot.onRoundFinish round => { ... }` | | 学习者与 Copilot 完成一轮对话时调用。`round.UserMessage` 是学习者的消息，`round.ResultMessages` 是回复。 |
| `Copilot.generateText(message)` | 生成的文本 | 等待生成结果。 |
| `Copilot.generateJSON message, result` | `result` 填好后 | 等待生成结果。 |

`generateJSON` 根据 `result` 的结构体类型推导出 JSON Schema，再把生成的值填进这个结构体：

- `result` 必须是指向结构体的非 nil 指针。
- 只使用导出字段。首字母小写的字段无法填写，会被忽略；至少要有一个可用字段。
- `json` 标签可以重命名字段，`json:"-"` 可以排除字段。其余字段在 schema 里都是必填的。
- 支持的字段类型包括字符串、布尔值、整数、浮点数、嵌套结构体，以及这些类型的指针、切片或数组。map、interface、
  channel、递归类型以及没有 `json` 名字的匿名嵌入字段都会被拒绝。

```go
type Review struct {
	Correct    bool
	Suggestion string
}

Editor.Runtime.onExit code => {
	question := "Does this code move Lita to Mushroom?\n" + Editor.Project.getCode("Lita")
	review := &Review{}
	Copilot.generateJSON question, review
	if review.Correct {
		complete
	} else {
		showMessage review.Suggestion
	}
}
```

### Spotlight

| 调用 | 说明 |
| --- | --- |
| `Spotlight.reveal target, tip` | 高亮 `target`，在旁边显示 `tip`，并压暗屏幕其余部分，直到学习者点击任意位置。 |
| `Spotlight.revealWith target, tip, options` | 同上，但显式指定 `SpotlightOptions`。 |

两者都在高亮出现后立即返回，从不等待高亮消失。

- `target` 是 Radar selector，由编辑器界面给元素起的稳定名字组成，例如 `"Code editor > Code text editor"`。
  Radar 的 node ID 每次会话都会重新生成，不能作为 target。selector 语法正在
  [#3441](https://github.com/goplus/builder/issues/3441) 中确定。一个 selector 匹配到多个元素时，它们会被一起高亮。
- `SpotlightOptions{Mask, Duration}`：`Mask` 压暗目标以外的一切；`Duration` 表示多少秒后自动隐藏高亮，`0` 表示一直
  保留到学习者点击任意位置。`reveal` 使用 `Mask: true, Duration: 0`。
- 语法错误的 selector 会让课程失败。语法正确但当前匹配不到任何元素的 selector（例如被 `filterAPIs` 隐藏的 API）
  不算错误：宿主会短暂重试，然后跳过这次高亮并记录一条警告。

```go
onStart => {
	Spotlight.reveal "Code editor > Code text editor", "Write your code here"
}

Editor.Runtime.onStart => {
	Spotlight.revealWith "Stage overview", "Watch where Lita goes", SpotlightOptions{Mask: false, Duration: 3}
}
```

## 调用失败时

一个调用无法完成它承诺的事情时，课程程序会带着错误停止，这次运行报告为 `error`。例如：

- `getCode` 指定了项目里不存在的精灵。
- spotlight 的 selector 语法错误。
- 生成失败，或者生成结果无法解码。
- 传给 `generateJSON` 的 `result` 不受支持。

这是有意的设计。如果课程在读取失败或对话框根本没出现之后还继续运行，就可能错误地判断学习者是否完成了任务。这类失败
属于编写课程时的错误，应该在试运行课程时暴露出来。唯一的例外是上面提到的、语法正确但当前匹配不到元素的 spotlight
selector。

## 在本地试运行课程

启动 spx-gui 开发服务器后，打开 `/debug/tutorial-courses`。这个页面用一个模拟宿主运行课程源码，模拟宿主会记录每一次
capability 调用并返回固定的值。预置用例会投递事件，运行以完成状态结束即为通过。自由运行区可以接受任意
`main_course.gox` 源码，并允许手动投递运行日志。

## 修改框架

先阅读 [AGENTS.md](./AGENTS.md)。其中列出了调度器规则、新增 capability 时如何分类、与 `client.ts` 之间的双边 wire
契约，以及导出 API 变化后 `tools/xgoexec-bundle` 需要重新生成的 qexp 导出。修改代码时，同步更新
`docs/develop/tutorial-v2` 下的契约。
