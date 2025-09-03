# 代码编辑器 Code Editor

Code Editor 是 XBuilder 中辅助用户编写 spx 代码的工具。

除了界面结构上属于 Code Editor 的部分外，该文档还会涉及一些界面上属于其他部分，但同样影响代码编写过程的内容，如项目调试、资源修改等。

## 基本概念

### 资源 Resource

资源是指 Project 中那些被显式定义，并可以在代码中引用（一般是通过其名字）的内容，包括但不限于：

* Sprite
* Costume
* Sound
* Backdrop
* Animation
* Widget

### 资源引用 Resource Reference

代码中对于资源的引用，我们记为 Resource Reference。

Code Editor 会识别代码中对 Project Resource 的引用，并通过 Inlay Hint 等方式对该信息进行可视化；Resource Reference 有两种：

1. 资源操作 API 调用处的 string literal，如 `play "explosion"`，记为 string-literal as a resource-reference
2. 触发 spx [auto-binding](https://github.com/goplus/spx/issues/379) 的 variable 对应的 identifier，记为 identifier as a resource-reference

此外，Code Editor 还会维护信息的同步：

* 在 Project 中将某个 Resource 重命名后，代码中对该 Resource 的引用也会被同步更新
* 在 Code Editor 中对 Resource Reference 进行重命名操作后，Project 中的 Recource 名称也会同步更新

### 悬浮提示 Hover

Hover 是这样一种交互模式，当用户将鼠标悬浮在某个元素上时，会在元素邻近位置显示一个浮层，浮层中包含：

* 元素的简要描述 Overview

  注意，当元素对应含多个 overload 的 function 时，每个 overload 对应一份 Overview

* 元素的详细描述 Detail

  注意，当元素对应含多个 overload 的 function 时，每个 overload 对应一份 Detail

* 元素相关的操作组 Actions，包括

  - 跳转到定义 Go to Definition
  - 重命名 Rename
  - 解释 Explain，调起 Copilot 对当前元素的定位、作用等进行解释
  - 修改引用 Modify Reference，对于 Resource Reference，提供修改引用的入口

  注意，当元素对应含多个 overload 的 function 时，它们对应同一组 Actions

具体的元素类型与浮层内容的对应关系如下（详见 https://realdream.larksuite.com/wiki/C3QWwOlPCitXpxkiDwLu5OMmsLd?sheet=i96sy2 ）

| **Hovered Node<br>https://go.dev/ref/spec**     | Overview                                                                                                                                                                                                                                           | Detail                | Action<br>Go to definition | Action<br>Rename           | Action<br>Explain | Action<br>Modify Reference |
|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|----------------------------|----------------------------|-------------------|----------------------------|
| **identifier bound to a package**               | `package {name}`<br>package fmt                                                                                                                                                                                                                    | Document, if there is | No                         | No                         | Yes               | No                         |
| **identifier bound to a type / type-parameter** | `type {name} {type}`<br>type A int                                                                                                                                                                                                                 | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a variable / parameter**   | `var {name} {type}`<br>var err error                                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a constant**               | `const {name} {type} = {value}`<br>const a int = 123                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifer bound to a function**               | `func {name}({parameters}) {result}`<br>func foo(a int) b int<br><br>NOTE: If there's multiple overloads and can't decide which one is used here (sometimes it can be decided if in a call expression), repeat all overload signatures                 | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifier for a field name**                 | `field {name} {type}`<br>field a int                                                                                                                                                                                                               | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **identifier for a method name**                | `func {name}({parameters}) {result}` (omit receiver)<br>func foo(a int) b int<br><br>NOTE: If there's multiple overloads and can't decide which one is used here (sometimes it can be decided if in a call expression), repeat all overload signatures | Document, if there is | Yes, if defined in project | Yes, if defined in project | Yes               | No                         |
| **string-literal as a resource-reference**      | `{resourceType} {name}`<br>Sound ""explosion""                                                                                                                                                                                                     | Preview for resource  | Yes, select the resource   | Yes                        | No                | Yes                        |
| **identifier as a resource-reference**          | `{resourceType} {name}`<br>Sprite ""NiuXiaoQi""                                                                                                                                                                                                    | Preview for resource  | Yes, select the resource   | Yes                        | No                | No                         |

### 标记 Marker

Marker 是 Code Editor 中的一种特殊的提示，用于将部分代码标记为特殊状态（如错误、警告等）。

Marker 包含以下信息：

* 级别 Level，包括 Error、Warning 等
* 信息 Message，描述问题的具体内容
* 范围 Range，对应代码文本中的一个范围

Marker 信息的来源包括：

* 语法错误 Syntax Error，实时检查
* 类型错误 Type Error，实时检查
* 资源引用检查 Resource Reference Check，根据 Resource 类型及名字检查引用是否正确，实时检查
* 运行时错误 Runtime Error，对应于可以定位到源代码位置的运行时错误，在项目运行时产生
* 审查结果 Review Result，来自 Vet、LLM 等工具，实时检查（视成本控制检查频率）

除了信息展示外，Marker 还提供相关操作的入口，操作包括：

* 修复问题 Fix Problem，调起 Copilot 对问题进行解释并提供修复建议

### 补全 Completion

Completion 是这样一种交互模式，当用户输入代码时，编辑器会根据当前上下文，提供一些可能的补全选项，用户可以通过键盘或鼠标在选项中进行选择。

每个补全选项包含以下信息：

* 类别 Kind，如 Variable、Function、Type 等
* 标签 Label
* 简要描述 Overview，同 Hover 中的 Overview
* 详细描述 Detail，同 Hover 中的 Detail

具体的输入位置与补全选项的对应关系如下（详见 https://realdream.larksuite.com/wiki/C3QWwOlPCitXpxkiDwLu5OMmsLd?sheet=sDY34F ）

| Input Position<br>https://go.dev/ref/spec          | Completion Items                                                                                                                                                                                                         |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| identifier in operand name                         | * identifiers declared in current or outer blocks, not bound to a type<br>* identifiers exported by package spx, not bound to a type<br>* fields & methods of current class (Sprite / Game)<br>* keywords (for, if, ...) |
| identifier in type name                            | * identifiers declared in current or outer blocks, bound to a type<br>* identifiers exported by package spx, bound to a type                                                                                             |
| identifier in qualified identifier in operand name | * identifiers exported by the package, not bound to a type                                                                                                                                                               |
| identifier in qualified identifier in type name    | * identifiers exported by the package, bound to a type                                                                                                                                                                   |
| identifier in selector                             | * fields & methods of current value                                                                                                                                                                                      |
| string-literal as a resource-reference             | * resources of current type                                                                                                                                                                                              |

### 上下文菜单 Context Menu

Context Menu 是用户在编辑器中通过右键或选中文本等操作调起的菜单，其中包含针对当前上下文的操作。

菜单的触发有两种：

1. 位置 Position：当没有选中任何代码时，菜单使用当前文档及光标位置作为上下文信息
2. 范围 Range：当选中了一段代码时，菜单使用当前选中范围作为上下文信息

对于 Position Context，提供如下操作：

* 重命名 Rename
* 跳转到定义 Go to Definition
* 其他如 Copy、Cut、Paste 等基础操作

Rename 与 Go to Definition 的具体行为取决于当前光标位置所对应的元素，与 Hover 逻辑一致。

对于 Range Context，提供如下操作：

* 解释 Explain，调起 Copilot 对选中的代码段的行为、作用等进行解释
* 审查 Review，调起 Copilot 对选中的代码段进行审查，提供关于代码风格、潜在问题等的建议
* 其他如 Copy、Cut、Paste 等基础操作

### 内联提示 Inlay Hint

Inlay Hint 是在代码中插入展示的一些提示信息或可操作元素，用于帮助用户理解当前代码的行为。

会展示 Inlay Hint 的情况包括：

* 资源引用 Resource Reference

  对代码中的 Resource Reference，通过图标等方式提示用户当前值关联了一个特定类型的 Resource。

  对于 string-literal as a resource-reference，点击图标可以对 Resource 进行选择，与 Hover 浮层中的 Modify Reference 操作类似。

一处 Inlay Hint 包含的信息包括：

* 类别 Kind，如 Sound、Sprite 等
* 位置 Position

### API 参考 API Reference

API Reference 对 Builder（spx）主要的 API 定义进行列举 & 说明，并允许将对应的代码片段插入到当前代码文件中。

API 定义有这样几种：

1. go/gop 语法结构，如 `for`、`if` 等，其对应的每种写法都对应一条 API 定义
2. go/gop 内置函数，如 `print`、`println` 等
3. spx 提供的能力或定义，如 `turn`、`Left` 等；当某个能力存在多种使用姿势时，每种使用姿势对应一条 API 定义

每条 API 定义对应的内容包括：

* 类别 Kind，如 Function、Type 等
* 简要描述 Overview，与 Hover 中的 Overview 类似
* 详细描述 Detail，与 Hover 中的 Detail 类似
* 代码片段 Code Snippet

支持的操作包括：

* 插入 Insert，将 API 定义对应的 Code Snippet 插入到当前代码文件中
* 解释 Explain，调起 Copilot 对当前 API 定义的作用、用法等进行解释

### 助手 Copilot

Copilot 是辅助代码编写的机器人助手，用户可以通过与 Copilot 进行对话的方式，获取帮助信息。Copilot 提供的能力包括：

* 启发 Inspire：根据用户的问题，提供解决问题的思路 & 引导

  Inspire 由用户通过输入框提出问题调起，在得到回复后用户可以继续追问。因此 Inspire 的内容由一轮或多轮对话组成。

* 解释 Explain：对指定对象进行解释，包括其行为、作用等

  Explain 由 Hover Action、Context Menu、API Reference 等功能中的 Explain 操作调起，调起时会提供需要被解释的对象信息，对象有两种：

  1. 代码段
  2. 定义（触发 hover 的元素或 API Reference 中的 API）

  “对该对象进行解释”是 Explain 界面的主题，在得到关于这个主题初始的回复后，用户可以继续追问。

* 审查 Review：对指定对象（一般是选中的代码段）进行审查，提供关于代码风格、潜在问题等的建议

  Review 由 Context Menu 等功能中的 Review 操作调起，调起时会提供需要被审查的对象信息，对象是选中的代码段。

  “对该对象进行审查”是 Review 界面的主题，在得到关于这个主题初始的回复后，用户可以继续追问。

* 修复问题 Fix Problem：对指定对象（一般是 Marker）提供修复建议

  Fix Problem 由 Marker 等功能中的 Fix Problem 操作调起，调起时会提供需要被修复的对象信息，信息与 Marker 包含的信息类似，包括 Level、Message、Range 等。

  “解释该对象并提供修复建议”是 Fix Problem 界面的主题，在得到关于这个主题初始的回复后，用户可以继续追问。

在 Copilot 的回复中，除了文字描述外，还可能包含一些特殊内容，包括：

* 代码链接 Code Link，可以引导用户跳转到代码文本中一个具体的位置或范围
* 代码块 Code Block，可以被用户添加到当前代码文件中
* 代码变更 Code Change，可以被用户直接应用到当前代码文件中

### 调试控制台 Debug Console

Debug Console 用于显示代码运行时输出的信息，记为 Runtime Output。目前主要有两个来源：

* 运行时错误 Runtime Error

  对应于 Go panic，我们应当在处理 panic 并输出时带上源代码位置信息

* 用户打印的日志信息 Runtime Log

  我们应当增强内置的 `print` / `println` 以携带源代码位置信息

每条 Runtime Output 包含以下信息：

* 类别 Category，包括 Error、Log 等
* 时间 Time
* 信息 Message
* 源代码位置 Source Location

  对于包含源代码位置信息且位置在 Project 的代码中的 Runtime Output，用户可以通过如点击操作在 Code Editor 中定位到对应的位置。

### 格式化 Format

Format 是指对已有代码进行格式化的操作，包括：

* Gop 风格化，同 `github.com/goplus/gop/x/format` 包提供的 `GopstyleSource`
* Gop classfile 风格化，详见 https://github.com/goplus/builder/issues/894

## User Story

### 编辑代码

用户选中 Stage 或某个 Sprite，并选择 Code 标签，即可用 Code Editor 打开 Stage 或 Sprite 对应的代码内容。

在代码编辑过程中，用户可以通过上述 Hover、Marker、Completion、Context Menu、API Reference、Copilot 等功能辅助代码的编写。

此外，用户还可以：

* 主动 Format 当前正在编辑的代码文件
* 主动运行 Project

### 运行 Project

用户在编辑过程中可以随时运行当前 Project，以检查行为是否符合预期

运行 Project 包括以下过程：

* Format 所有代码文件
* 清空 Runtime Output
* 基于当前 Project Game 内容运行
* 收集 Runtime Output 并展示到 Debug Console 或以 Marker 形式展示到 Code Editor 中
* 用户可以在运行时与游戏进行交互，同时查看 Debug Console 中的输出或对应代码
* 用户可以随时停止运行 Project

  注意停止运行时 Runtime Output 不会被清空，它们会被保留直到 Project Game 内容发生变更或再次运行 Project
