# 用户教程 User Tutorial

有两个诉求需要被满足：

1. Builder 本身作为一个 IDE，其使用有一定的门槛，需要帮助用户学习使用 Builder 的功能；一般这会体现为 User Manual 或 Product Tour
2. （基于游戏的）编程教育；一般这会体现为专门设计的课程系统

User Tutorial 的目标是满足需求 1，并在有限的程度上满足需求 2，比如 User Tutorial 不会考虑实现创作者系统、用户激励、付费课程等复杂的功能特性。

考虑需求 1，好的 Product Tour 要求：

* 个性化
* 可交互性
* 用户操作触发

考虑需求 2，好的编程教育课程需要：

* 丰富
* 循循善诱
* 低创作成本

我们选择增强机器人助手（Copilot）的能力，并围绕其能力创作课程，由其引导用户完成学习。

## 基本概念

### 助手 Copilot

在 [Code Editor](./code-editor.zh.md) 中引入的 Copilot 基础上，我们调整其定位为：辅助用户使用 Builder 的机器人助手，用户可以通过与 Copilot 交互，获取帮助信息。

它体现为一个悬浮在其他元素之上的对话框，用户可以在其中输入问题或指令，Copilot 会根据用户的输入和当前 Builder 的状态，给出相应的提示或操作建议。

对应地，Copilot 会增加以下的能力：

* 可以感知 Builder 的界面状态，并理解其中不同 UI 元素的功能
* 通过特殊的回复内容影响 Builder 的界面，如高亮特定 UI 元素并显示提示
* 感知 Builder 中发生的事件，并主动进行对话

	- 前提是当前的用户意图明确，如用户正在某个 Tutorial Course 中
	- 事件可能包括：用户完成某个操作、游戏退出等
	- 感知“一般的用户操作”在实现上是有挑战的；我们可能会在前期实现时退化为由用户主动触发，如对话框中提供一个固定的“继续”按钮供用户点击

Copilot 对应的对话框默认隐藏，当存在 Session 时显示。

### 助手会话 Copilot Session

一个 Copilot Session 对应于 Copilot 与用户之间的一批交互。

每个 Copilot Session 包括独立的：

* Topic: 主题；它会影响 Copilot 关注的信息、事件及能够调用的能力

	如通过 Tutorial 发起的 Session，其 Topic 会包含对应的 Course 信息。

* Messages: 本次会话中的对话历史

用户在使用 Copilot 时，同时只会有一个 Session 生效。

Session 可以被创建，如

* 用户通过某个常驻的入口唤起 Copilot
* Builder 在特定的场景下自动唤起 Copilot（如用户进入 Tutorial Course 时）

Session 可以被结束，如

* 用户通过某个关闭按钮关闭会话
* Builder 在特定的场景下自动结束会话（如用户完成 Tutorial Course 时）
* 新的 Session 被创建

### 课程 Course

Course 是 User Tutorial 的核心概念，它是一个包含一系列步骤的教学内容，旨在引导用户完成特定的学习目标。

取决于学习目标，一个 Course 的复杂度可能低也可能高，“为 Sprite 添加一个 Animation”或“创作一个 Flappy Bird 游戏”都可以是一个 Course。一般来说，我们鼓励将一个 Course 设计为一个较小的学习单元，便于用户在短时间内完成。

Course 与 User 有两种关系：

1. Course 由某个 User 创作，这里 Course 与 User 是多对一的关系
2. Course 可以被其他 User 学习，这里 Course 与 User 是多对多的关系

此外，Course 包含以下信息：

* Title: 标题，对 Course 的简单描述
* Thumbnail: 缩略图
* Url: 初始 URL，用户进入 Course 时 Builder 会自动跳转到该 URL
* References: 参考信息，Course 中可能会引用其他的内容（如 Project）作为参考
* Prompt: 提示信息，Course 的创作者可以编写提示信息，用于向 Copilot 说明 Course 的设计和目标

### 公开课程列表 Course Gallery

Course Gallery 是一个由 Builder 官方维护的列表，列出推荐的 Course，供普通用户浏览和学习。

### 课程管理员 Course Admin

Course Admin 是一类特殊的 User。他们可以

* 添加并管理自己创作的 Course（这个权限后续可能会对更多用户开放）
* 管理 Course Gallery

### 无副作用模式编辑器 Effect-free Mode Editor

我们对编辑器的能力进行扩展，允许用户通过编辑器打开不属于自己的 Project，并继续编辑 Project 内容。这种编辑器状态称之为 Effect-free Mode。

在 Effect-free Mode 下：

* 编辑的内容不会被保存到云端
* 用户不可以发布项目
* 用户可以将当前状态保存为新的（属于用户自己的）项目

Effect-free Mode 可能被用于这样的场景：

* 在 User Tutorial 中，用户可以在 Effect-free Mode 下打开对应的 Project，学习编写代码、操作资源等。
* 在 Project 页面，用户可以在 Effect-free Mode 下直接打开他人的公开 Project，这样用户可以更低成本地查看公开 Project 的实现细节而无须先 Remix。

### 游戏退出

游戏退出是指游戏的执行结束，一般对应于游戏代码中的 `exit` 调用。

当 exit code 为 0 时，表示游戏正常退出；当 exit code 为非 0 时，表示游戏异常退出。我们推荐编程类的 Course 设计为，在用户完成了 Course 要求的任务后，游戏自动正常退出。这让 Builder 感知到用户完成了编程任务。

## User Story

### 用户学习“创建 Project”

* 用户进入 Course“创建 Project”，对应地：

	- Builder 跳转到 Course 对应的初始 URL，如 `/`（首页）
	- Builder 基于 Course 信息创建新的 Copilot Session 并给出提示：

		> 要创建一个新的 Project，请打开导航栏中的「项目下拉菜单」，点击其中的「新建 Project」菜单项

		如用户点击其中的「项目下拉菜单」，Copilot 会将导航栏中对应的 UI 元素高亮显示，并在其下方显示提示信息：「鼠标移入」。

* 用户在 Copilot 的帮助下，点击「新建 Project」按钮，打开对应的模态框

* Copilot 继续提示用户

	> 在「Project 名输入框」中输入想要的 Project 名，然后点击「创建」按钮

	如用户点击其中的「Project 名输入框」，Copilot 会将输入框高亮显示，并在其下方显示提示信息：“在这里输入”；如用户点击「创建」按钮，Copilot 会将按钮高亮显示，并在其下方显示提示信息：“点击这里提交”。

* 用户完成输入并点击「创建」按钮后，Builder 跳转到新创建的 Project 页面，Copilot 继续提示用户

	> 恭喜你！Project 创建成功，你可以继续学习下一个课程：「移动 Sprite」，或返回「课程列表」。

	如用户点击「移动 Sprite」，Builder 会进入对应的 Course。如用户点击「课程列表」，Builder 会打开 Course Gallery 页面。

	本次 Course 对应的 Copilot Session 结束。

### 创作 Course“创建 Project”

* 选择 `/`（首页）作为 Course 初始 URL
* 编写 Prompt，如

	```
	### 目标

	引导用户创建一个新的 Project，在这个过程中帮助用户学会 Builder 的基本操作，并理解 Project 的概念。

	### 步骤

	1. 找到“新建 Project”的入口
	2. 按照界面提示完成新建 Project
	```

* 保存并进行测试
* 测试完成后将其添加到 Course Gallery

### 用户学习编程中的循环概念

* 用户进入 Course“循环”，对应地：

	- Builder 跳转到 Course 对应的初始 URL，如 `/editor/<course_author>/loop`（在 Effect-free Mode 下打开 Project `loop`）
	- Builder 基于 Course 信息创建新的 Copilot Session 并给出提示：

		> 在这个课程中，你将学习编程中的循环概念。在当前 Project 中，我们设计了一个任务，你需要使用循环来完成它。
		> 首先确保你选中了「Sprite A」，接下来的任务将通过修改 Sprite A 的代码来完成。

		如用户点击「Sprite A」，Copilot 会将右下角 Sprite 面板中 A 所对应的 UI 元素高亮显示，并在其下方显示提示信息：“点击选中 Sprite A”。

* 用户在 Copilot 的帮助下，选中「Sprite A」，Copilot 继续提示用户

	> 现在，你可以在「代码编辑器」中看到 Sprite A 的代码。可以看到现在 Sprite A 在游戏开始后会向前移动 10 步。接下来，我们需要让它重复这个动作 5 次。
	> 我们可以通过「repeat 语句」来实现这个功能。在修改完成代码后，你可以通过「运行」按钮来测试它。

	如用户点击「代码编辑器」，Copilot 会将代码编辑器高亮显示，并在其下方显示提示信息：“在这里编辑代码”；如用户点击「repeat 语句」，Copilot 会将 API Reference 中对应的 UI 元素高亮显示（按需滚动使其进入可视区），并在其下方显示提示信息：“点击或拖动将其插入到代码中”。如用户点击「运行」按钮，Copilot 会将运行按钮高亮显示，并在其下方显示提示信息：“点击这里运行并测试代码”。

* 用户在 Copilot 的指导下修改代码

	在这个过程中随时可以通过在 Copilot 对话框中描述自己遇到的问题并得到建议。
	
	也可以通过其他 Copilot 功能的入口（如 Code Editor 中 Diagnostics 对应的“修复问题 Fix Problem” 按钮）来向当前 Copilot Session 中追加问题并得到回复。

* 用户完成代码修改并按要求成功运行（游戏正常退出）后，Copilot 继续提示用户

	> 恭喜你！你已经成功使用循环来完成了任务。现在你可以继续学习下一个课程：「条件判断」，或返回「课程列表」。

	如用户点击「条件判断」，Builder 会进入对应的 Course；如用户点击「课程列表」，Builder 会打开 Course Gallery 页面。

	本次 Course 对应的 Copilot Session 结束。

### 创作 Course“循环”

* 在自己的账号下创建一个 Project，名为 `loop`，并在其中添加 Sprite A 并编写代码，包括

	- 在 Sprite A 的代码中添加一个 `onStart` 事件处理器，在回调中执行 `step 10`，留待用户进一步修改
	- 在舞台代码中持续检查 Sprite A 是否移动到了 50 步外的位置，如果是，则通过 `exit 0` 退出游戏

* 发布 Project `loop` 后，使用 `/editor/<course_author>/loop` 作为 Course 的初始 URL
* 基于 `loop` 创建一个新的 Project `loop-solution`，修改其代码使其包含正确的答案并发布，将 Project 添加到 Course 的 References 中
* 编写 Prompt，如

	```
	### 目标

	引导用户使用循环来完成任务，在这个过程中帮助用户学会使用 `repeat` 语句来实现循环。
	
	这个任务中我们要求用户使用代码控制 Sprite A 在游戏开始后重复“向前移动 10 步”的操作 5 次，以最终达到 Sprite A 移动 50 步的效果。

	### 步骤

	1. 确保用户选中了 Sprite A 并在代码编辑器中查看其代码
	2. 修改 Sprite A 的代码，使其在游戏开始后重复向前移动 10 步，重复次数为 5 次
	3. 测试代码是否正确运行（游戏正常退出）

	### 其他

	* 我们只希望用户修改 Sprite A 的代码，不希望用户修改舞台代码
	* 用户如果使用其他方式（如 `for` 语句）来实现循环，我们也会视作正确答案，并告诉他可以通过 `repeat` 语句来简化代码
	* 请参考项目 `loop-solution` 来了解正确答案
	```

* 保存并进行测试
* 测试完成后将其添加到 Course Gallery

### 用户浏览 Course Gallery

用户可以在 Course Gallery 浏览我们推荐的 Course：

* Course 被组织为不同的分类，用户可以通过分类筛选 Course
* 用户可以看到每个 Course 的 Title、Thumbnail 等信息
* 用户可以通过点击列表中 Course 对应的项开始该 Course 的学习

### 管理 Course Gallery

Course Gallery 由 Course Admin 管理，Course Admin 可以：

* 添加新的 Course 到 Gallery
* 删除不合适的 Course
* 调整 Course 的分类及排序

### 管理自己创作的 Course

Course Admin 可以管理自己创作的 Course，包括：

* 修改 Course 的 Title、Thumbnail、Prompt、References 等信息
* 删除 Course
