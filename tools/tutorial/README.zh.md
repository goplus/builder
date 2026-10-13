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
| `index.json` | 框架配置。`project.type` 和 `project.root` 指明内嵌的学习者项目，`copilotContext` 是给 Copilot 的作者指令、学习者看不到，`inEditorPath` 是编辑器打开时所在的路径，例如 `/simple/sprites/Lita`。 |
| `main_course.gox` | 课程程序。 |
| `project/` | 一个普通的序列化 SPX 项目。学习者上课时，它会成为一个没有 owner 的内存项目。 |
| `assets/videos/<name>/index.json` | 声明名为 `<name>` 的视频。其中的 `path` 指向视频文件，相对于该目录。课程代码只用 `<name>` 引用视频。 |
| `assets/images/<name>/index.json` | 以同样的方式声明名为 `<name>` 的图片。目前还没有课程 API 使用图片，先随课程保存，留给将来的 API。名字在每种资源类型内唯一，所以一个视频和一张图片可以同名。 |

完整目录见[示例课程](../../docs/develop/tutorial-v2/example-tutorial-course/)。

## 第一节课

下面是示例课程的 `main_course.gox`：

```go
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	Spotlight.reveal "api-references", "Here is stepTo, the only block you need in this lesson."
}

// Only the latest "reached-target" matters: a newer signal cancels a
// judgement that is still waiting on Copilot.
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

课程开始时，它把 Code Editor 限制为只提供一个 API，展示任务说明，播放一段视频，并高亮 API 列表。随后课程开始等待。
Lita 碰到 Mushroom 时，学习者的项目会输出 `reached-target`（`Mushroom.spx` 里的 `println "reached-target"`），
`onLog` 回调把这个信号转成一次带生成反馈的完成。`judging` 是一个运行组：如果 Copilot 还在为第一个信号生成反馈时又
来了一个 `reached-target`，前一次评判会被取消，以新的一次为准。[运行组](#运行组)一节会解释这一点。

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
	Editor.Ruler.enable
	code := Editor.Project.getCode("Lita")
	echo code
}
```

### 顶层代码与课程开始

`main_course.gox` 的顶层语句在程序启动时执行一次，用来声明共享状态和注册回调。顶层语句执行完后，"课程开始"才会投递给
每个 `onStart` 回调，所以开场流程运行时，所有回调都已经注册好了。

声明要放在前面。顶层语句构成课程入口函数的函数体，每个 `func` 都必须在第一条顶层语句之前声明。写在语句之后的 `func`
会被当作函数字面量解析，课程无法编译：`expected '(', found <name>`。`type` 声明也放在文件开头，让文件自上而下读起来
顺畅。

回调里也可以注册新的回调，新回调从下一次事件开始生效。课程开始之后才注册的 `onStart` 回调不会被调用。

### 执行模型

- **同一时刻只有一次运行在执行。** 课程回调以"运行"（run）为单位执行。任一时刻只有一次运行在执行课程代码，所以回调之间
  共享的变量不会发生数据竞争，课程代码不需要任何锁。
- **等待类调用会让其他运行继续。** `showPrelude`、`showMessage`、`showVideo`、`generateText` 和 `generateJSON`
  会等待学习者或等待生成结果。一次运行等待期间，其他运行照常进行，包括同一个回调的其他运行，所以调用返回时，
  共享状态可能已经变了。
- **运行之间可以重叠。** 每次触发都会为注册在该事件上的每个回调启动一次新的运行。前一次运行还在等待时到达的触发会
  启动第二次运行，两次运行在等待点交错。除非有[运行组](#运行组)把它们关联起来，运行之间彼此独立。
- **启动顺序是确定的。** 触发按到达顺序处理。同一次触发中，各回调按注册顺序启动，每个回调运行到第一个等待点或结束后，
  下一个才启动，之后各自独立进行。用 `start` 启动的运行在发起它的运行下一次等待或结束时开始。必须按顺序发生的步骤要
  写在同一个回调里。
- **展示不会被串行化。** 多次运行同时请求 `showPrelude`、`showMessage` 或 `showVideo` 时，由宿主决定后一个调用是
  排队等候、被拒绝，还是关掉前一个。需要按顺序出现的一串展示要写在同一个回调里。Spotlight 不属于展示：`reveal`
  在高亮出现后立即返回，可以和对话框同时存在。
- **没有定时器。** 框架没有 `sleep`，也没有调度器。课程只对事件和"学习者看完了某个展示"作出反应。

```go
onStart => {
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	showMessage "Now try it yourself."
}
```

### 运行组

运行组（run group）用来关联原本会重叠的运行。一个组同一时刻最多持有一次运行，组的策略决定：当组还被某次运行持有时，
又启动了这个组的一次新运行，会发生什么：

| 策略 | 组被持有期间 | 适用于 |
| --- | --- | --- |
| `CancelPrevious` | 持有组的运行被取消，新运行取而代之。 | 只有最新一次才算数的触发：在项目退出或 Copilot 完成一轮对话时评判。 |
| `OneAtATime` | 新运行排队等候，在持有者结束后开始。 | 每次都必须完整、按序处理的触发，例如每失败一次就给一条提示。 |
| `SkipWhileBusy` | 新运行根本不会启动。 | 某个条件成立期间反复出现的信号，例如项目每一帧都输出的一行：评判一次，其余忽略。 |

学习者每做一次动作才触发一次的事件（项目退出、Copilot 完成一轮对话）适合 `CancelPrevious`：学习者又做了新动作，之前
的评判已经过时。在什么都没变的情况下自行重复的信号适合 `SkipWhileBusy`：重复的信号没有带来新信息，若为每一次重复都
取消前一次，评判就永远完成不了。

`newRunGroup policy` 创建一个组，`start` 启动这个组的一次运行：

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

`start` 不会等待它启动的运行。新运行在发起它的运行下一次等待或结束时开始；`start` 之后的语句不属于新运行，它们仍然
属于发起方，两者像任何其他运行一样在等待点交错。需要受策略保护的内容都要写在大括号里面。组要在顶层创建：在回调里
创建的组对每次运行都是新的，关联不了任何东西。

#### 把回调绑定到组

每个事件注册（`Editor.Runtime.onStart`、`onExit`、`onLog` 以及 `Copilot.onRoundComplete`）都接受一个可选的第一个参数，
可以是组或策略，这会让整个回调成为该组的一次运行：

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onExit judging, code => {
	showMessage "You stopped the project. Did Lita reach Mushroom?"
}
```

它完全等价于：

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onExit code => {
	judging.start => {
		showMessage "You stopped the project. Did Lita reach Mushroom?"
	}
}
```

直接给策略（`Editor.Runtime.onExit OneAtATime, code => { ... }`）表示一个只属于这个回调的匿名组。两者都不给时，
该回调的各次运行彼此独立，可以重叠。

组要放在做事的地方，而不是触发的地方。会过滤触发的回调保持普通写法，在过滤之后再调用 `start`：如果把上面的 `onLog`
回调整体绑定到 `CancelPrevious`，项目输出的每一行都会成为组的一次运行，任何一条无关的输出都会取消正在进行的评判。
`onExit` 没有什么可过滤的，所以可以在注册时绑定。

#### 一个组跨多个事件

组只记录哪次运行持有它，从不记录那次运行是哪个回调启动的。所以一个组被不同事件的回调共享时，它们的运行之间的关系与
同一个回调的多次运行完全一样：`onExit` 发起的评判会取消 `onLog` 发起的评判，反过来也一样。这正是运行组存在的意义。

```go
type Verdict struct {
	Passed  bool
	Comment string
}

func judge(trigger string) {
	prompt := "The learner " + trigger + ". Does this code walk Lita to Mushroom with stepTo?\n" + Editor.Project.getCode("Lita")
	verdict := &Verdict{}
	Copilot.generateJSON prompt, verdict
	if verdict.Passed {
		completeWith verdict.Comment
		return
	}
	showMessage verdict.Comment
}

judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		judge("made the project print reached-target")
	}
}

Editor.Runtime.onExit judging, code => {
	judge("stopped the project")
}

Copilot.onRoundComplete judging, round => {
	judge("asked Copilot about: " + round.UserMessage)
}
```

学习者运行项目、得到 `reached-target`，又在 Copilot 还在评判时停止了项目，只会看到一个结论：退出取消了日志发起的
评判。[运行组示例课程](../../docs/develop/tutorial-v2/example-tutorial-course-run-groups/)就是这样写成的一节完整课程，
提示则通过另一个组排队展示。

#### 取消意味着什么

取消在等待点生效，并且是无声的。被取消的运行在下一个等待类调用处结束：如果它正在等待，宿主结束该调用时其结果会被
丢弃，所以 `generateJSON` 的结构体不会被填写；否则它在发起下一个等待类调用之前结束。两个等待点之间的语句照常执行。
宿主不会得到通知：被取消的运行已经打开的对话框不会被撤回，仍然要由学习者关闭。取消不是错误，课程继续进行。

#### 逐条展示提示

```go
attempts := 0

Editor.Runtime.onExit OneAtATime, code => {
	attempts++
	if attempts >= 3 {
		showMessage "Hint: stepTo takes a sprite name, like stepTo Mushroom."
	}
}
```

快速连停三次会一条接一条地展示三条提示，而不是同时弹出三个对话框。排队等候的运行不占用任何资源，也不会拖住别的
东西；它在前一次运行结束时开始，所以排队的运行里的 `attempts++` 发生在前一条提示被关闭之后。`complete` 之后，仍在
排队的运行不会再开始。

#### 规则

- 组的一次运行不能再启动同一个组的运行。在 `CancelPrevious` 下它会取消自己，在另外两种策略下新运行永远无法开始。
  框架会把它报告为错误，课程失败。
- 高频事件上的回调绝不在组外等待。先过滤，再 `start`。
- 一次运行要更新共享状态，应在它的第一个等待类调用之前更新，因为它等待期间其他运行还在继续。

### 高频事件

事件的每次触发都会为它的每个回调启动一次运行，而走到等待类调用的运行会一直挂着，直到学习者或生成结果作出回应。
所以在高频事件的每次触发上都等待的回调，会在事件持续触发时不断堆积运行。例如在 `onLog` 里为游戏输出的每一行都
打开一个对话框，每一次运行都会请求自己的对话框或生成。

不要让高频事件的常规路径上出现等待类调用。对无关的触发尽早返回，让绝大多数运行立即结束；对于某个条件成立期间反复
出现的信号，用一个 `SkipWhileBusy` 的组吸收它：

```go
touching := newRunGroup(SkipWhileBusy)

Editor.Runtime.onLog log => {
	if log != "touching-mushroom" {
		return
	}
	touching.start => {
		showMessage "Lita is touching Mushroom. Stop the project when you are done."
	}
}
```

对话框打开期间，项目每一帧都还在输出 `touching-mushroom`，这些触发全部在 `start` 处被丢弃。换成 `CancelPrevious`，
每一帧都会取消前一次运行，对话框永远留不住。

尚未投递的事件在一个最多容纳 1024 个的队列里等待。运行一旦开始等待就会交还控制权，所以正常的课程离这个上限很远。
只有当某次运行一直不交还控制权时（例如一个永远走不到等待类调用的循环），队列才会被填满。这期间课程里的其他代码
都无法运行，后续事件会被拒绝并作为错误报告给宿主，课程在等的信号可能因此再也收不到。

### 完成

`complete` 和 `completeWith message` 会结束课程：

- 新的触发不再启动运行，队列中尚未投递的事件会被丢弃，已经启动但尚未开始的运行（无论是否在 `OneAtATime` 下排队）
  不会再开始。
- 已经在执行或等待的运行会执行完剩余的语句，包括 `complete` 之后的语句，除非它们的某个调用失败或被取消。
- 只有第一次 `complete` 或 `completeWith` 生效，之后的调用没有任何效果。
- 然后程序结束。Playground 会立即接受完成并结束程序所在的会话：仍在进行的展示或生成会被取消，之后请求的任何内容都
  到不了学习者那里。无论如何课程都算完成，即使程序自身因为某个未完成的调用被取消而以错误退出。告别语要放在
  `completeWith` 里，而不是放在 `complete` 之后的 `showMessage` 里。

`completeWith` 会把消息作为反馈展示给学习者。上面第一节课就是根据学习者的代码生成这条消息的。

## API 参考

### Course

| 调用 | 何时返回 | 说明 |
| --- | --- | --- |
| `onStart => { ... }` | | 注册课程开始回调。 |
| `showPrelude message` | 学习者关闭后 | 展示开场任务说明。与 `showMessage` 的区别只在宿主的呈现方式。 |
| `showMessage message` | 学习者关闭后 | 展示对话框。 |
| `showVideo name` | 学习者看完后 | 播放已声明的视频 `name`，参数不是文件路径。什么算看完由宿主决定。 |
| `complete` | 立即 | 结束课程，不展示反馈。见[完成](#完成)。 |
| `completeWith message` | 立即 | 结束课程，并把 `message` 作为反馈展示。 |
| `newRunGroup(policy)` | 一个运行组 | `policy` 是 `CancelPrevious`、`OneAtATime` 或 `SkipWhileBusy` 之一。见[运行组](#运行组)。 |

展示从不自动推进。

### RunGroup

| 调用 | 何时返回 | 说明 |
| --- | --- | --- |
| `group.start => { ... }` | 立即 | 启动该组的一次运行来执行大括号里的内容。新运行在发起它的运行下一次等待或结束时开始；组还被另一次运行持有时会发生什么，由组的策略决定。 |

组或策略也可以作为下面任何事件注册的第一个参数，这会让整个回调成为该组的一次运行。

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

三者都接受在回调之前给一个运行组或策略：`Editor.Runtime.onExit judging, code => { ... }`、
`Editor.Runtime.onExit OneAtATime, code => { ... }`。

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
| `Editor.Ruler.enable` | 在舞台上打开标尺。 |
| `Editor.Ruler.disable` | 关闭标尺。 |

```go
onStart => {
	Editor.Ruler.enable
	showMessage "Look at the coordinates on the stage."
	Editor.Ruler.disable
}
```

### Copilot

课程代码发起的调用不会出现在学习者的 Copilot 对话里。

| 调用 | 返回 | 说明 |
| --- | --- | --- |
| `Copilot.onRoundComplete round => { ... }` | | 学习者与 Copilot 完成一轮对话时调用。`round.UserMessage` 是学习者的消息，`round.ResultMessages` 是回复。回调之前可以给一个运行组或策略。 |
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

- `target` 是 Radar selector。名字是编辑器界面给元素起的稳定角色名，全小写、用连字符连接，例如 `code-text-editor`、
  `simple-code-editor`、`stage-overview`、`ruler`、`api-references`。空格表示"在……之内"，`[属性="值"]` 用元素的某个
  属性进一步缩小范围：`api-reference[name="Sprite.stepTo"]` 选中 API 参考里 `stepTo` 的各个条目。值是 JSON 字符串，
  所以这样的 selector 要写成原始字符串，见下面的例子。名字和值都是精确比较，区分大小写。完整语法见
  [`module_Radar.ts`](../../docs/develop/tutorial-v2/module_Radar.ts)。Radar 的 node ID 每次会话都会重新生成，不能作为
  target。一个 selector 匹配到多个元素时，它们会被一起高亮。
- `SpotlightOptions{Mask, Duration}`：`Mask` 压暗目标以外的一切；`Duration` 表示多少秒后自动隐藏高亮，`0` 表示一直
  保留到学习者点击任意位置。`reveal` 使用 `Mask: true, Duration: 0`。
- 语法错误的 selector 会让课程失败。语法正确但当前匹配不到任何元素的 selector（例如被 `filterAPIs` 隐藏的 API）
  不算错误：宿主会短暂重试，然后跳过这次高亮并记录一条警告。

```go
onStart => {
	Spotlight.reveal `api-reference[name="Sprite.stepTo"]`, "stepTo is the only block you need"
}

Editor.Runtime.onStart => {
	Spotlight.revealWith "stage-overview", "Watch where Lita goes", SpotlightOptions{Mask: false, Duration: 3}
}
```

## 调用失败时

一个调用无法完成它承诺的事情时，课程程序会带着错误停止，这次运行报告为 `error`。例如：

- `getCode` 指定了项目里不存在的精灵。
- spotlight 的 selector 语法错误。
- 生成失败，或者生成结果无法解码。
- 传给 `generateJSON` 的 `result` 不受支持。
- 组的一次运行启动了同一个组的运行。

这是有意的设计。如果课程在读取失败或对话框根本没出现之后还继续运行，就可能错误地判断学习者是否完成了任务。这类失败
属于编写课程时的错误，应该在试运行课程时暴露出来。唯一的例外是上面提到的、语法正确但当前匹配不到元素的 spotlight
selector。

## 在本地试运行课程

启动 spx-gui 开发服务器后，打开 `/debug/tutorial-courses`。这个页面用一个模拟宿主运行课程源码，模拟宿主会记录每一次
capability 调用并返回固定的值。预置用例会投递事件，运行以完成状态结束即为通过。自由运行区可以接受任意
`main_course.gox` 源码，并允许手动投递运行日志。模拟宿主会立即应答，那里不会有任何运行处于等待状态，所以这个页面
展示不出取消。

## 修改框架

先阅读 [AGENTS.md](./AGENTS.md)。其中列出了调度器规则、新增 capability 时如何分类、与 `client.ts` 之间的双边 wire
契约，以及导出 API 变化后 `tools/xgoexec-bundle` 需要重新生成的 qexp 导出。修改代码时，同步更新
`docs/develop/tutorial-v2` 下的契约。
