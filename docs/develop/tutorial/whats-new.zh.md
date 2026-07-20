# 这个分支加了什么 What this branch adds

这次教程重构，把课程从**「copilot 照着念的剧本」**变成了**「copilot 在旁边看着的游乐场」**。
本文梳理改动面：现在有什么以前没有的东西，以及每一块为什么长成这样。

课程怎么写，见[课程编写](./course-authoring.md)。发给模型的全部内容，见 [LLM payload](./llm-payload.md)。
怎么验证一门课真的能通关，见[课程验证](./verifying-courses.md)。
本文的英文版在 [whats-new.md](./whats-new.md)。

## 一段话讲清设计

copilot **默认沉默**。它通过真实的编辑器事件感知用户的一举一动，但在用户卡住、明显跑偏、或主动提问之前
一言不发。它**能做多少**不靠提示词里的礼貌用语约束——**干预层级**决定了哪些引导工具会被**注册**，
所以当前层级不该用的工具，对它来说根本不存在。而层级本身，由模型每轮自己给出的「用户是否在靠近目标」
的判定来驱动。

## 1. 干预层级——硬边界，不是建议

`tutorial-intervention.ts`、`tutorial-guidance.ts`、`user-progress.ts`

三个层级：**Silent(1) → Nudge(2) → Guide(3)**。每一级注册不同的自定义元素集合；
不可用的工具会被**取消注册**，copilot 想用也够不着。

| 层级 | 存在哪些工具 |
|---|---|
| Silent | 只有 `api-video` |
| Nudge | `+ guide-modal`、`spotlight-hint` |
| Guide | `+ 编辑器内代码引导` |

层级靠**进展判定**移动：每个事件轮次，模型都要报告
`<user-progress-ahead/>` / `<user-progress-neutral/>` / `<user-progress-back/>`。
系统对其计数（`neutralThreshold = 6`、`backThreshold = 3`）；一次 *ahead* 会抵消计数，
当没有什么需要抵消时则触发降级。用户打字提问会临时把层级抬到至少 Nudge——**开口问了的人，值得一个回答**。

在这里，光靠提示词规则被证明是不可靠的。有效的顺序是：
**先机制**（取消注册工具）、**再每轮提醒**、**最后才是协议文字**。

## 2. 感知：真实编辑器事件，不再轮询

`editor/copilot/user-events.ts`

copilot 以前靠定时器醒来。现在它靠真实发生的事情醒来：运行开始/停止、游戏退出（任意退出码）、
**运行时输出**、防抖后的代码变更、诊断信息、精灵/标签页切换。

其中「运行时输出」这一条是关键：过关的信号本身就是一行日志，**只在报错时醒来意味着编程类课程永远无法完成**。

## 3. 真正闭嘴的沉默

`copilot/markdown-elements/StaySilent.ts`、`copilot/content-visibility.ts`、`CopilotUI.vue`

`<stay-silent />` 会隐藏**整轮**内容，包括漏在它周围的推理文字。聊天窗口里**只显示用户打字的轮次**——
事件驱动的轮次在后台无形地跑。被取消的事件轮次也一并跳过（用户继续编辑会中止在途的轮次，那不是该展示的东西）。

> **值得记住的坑：** 有好几个元素是在挂载时才生效的（`api-reference-filter`、`api-video`、
> `spotlight-hint`、成功/放弃元素）。**不渲染某一轮 = 元素永远不挂载 = 效果静默失效。**
> 所以隐藏轮次必须用 `v-show`，绝不能用 `v-if`。
> 这个坑实打实耗掉了一轮排查，最后靠 A/B 实验才定案（`apiItemCount: 128` 对比 `1`）。

## 4. 课程作者声明的工作区

`tutorials/course-config.ts`、`editor/workspace-layout.ts`

课程在提示词里用一个 ```jsonc 块声明自己的工作区——这是静态的作者意图，不是 copilot 运行时的决定：

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  "copilot": "open"
}
```

背后是 `workspace-layout.ts` 这个**编辑器自己拥有的扩展点**：专注布局、可隐藏区域、可选工具。
功能模块通过它驱动编辑器，而**编辑器永远不 import 教程的代码**。
退课时的 `reset()` 保证没有任何设置能活过这门课程。

## 5. 尺子

`editor/preview/stage-viewer/StageRuler.vue`、`ruler-math.ts`

一个只在课程中出现的舞台工具：拖拽测距，端点会吸附到精灵中心。
当测量的**起点落在精灵上**时，它还会读出**转向角度**——带符号，所以那个数字正是 `turn` 需要填的值
（右转为正、左转为负，与 `Left = -90` / `Right = 90` 一致）。

正是它让「有多远？」和「该往哪转？」变成**可以量出来**的，而不是靠猜。第 3、8、9 课都建立在它之上。

## 6. copilot 的呈现方式

`CopilotUI.vue`、`copilot.ts`

停靠式面板，历史可滚动、高度自动增长；去掉了「Next step」按钮；会显示用户自己发的消息。
课程**后台优先启动**：`Topic.autoOpenOnEvents = false` 意味着环境类事件（页面跳转、模态框）
永远不会弹开面板——**包括页面刷新时触发的跳转事件**，那个曾经让面板在课程中途自己冒出来。
主题就是 copilot 本身的课程，用 `"copilot": "open"` 来豁免。

教程话题会设置 `hideCodeInChat`：带代码的元素照常驱动编辑器内的引导，但在聊天里把代码渲染成不可选中的
——**看得见，抄不走**。

## 7. 开场序列

`TutorialStoryVideoModal.vue`、`TutorialPreludeModal.vue`、`ApiVideo.vue`、`api-videos.ts`

故事视频（系列世界观）→ 知识点视频（只播真正新的 API）→ 一句话开场提示 → 进入编辑器。
API 视频按 definition id 索引，并按用户记录已学过的，所以**同一个概念不会被讲第二遍**。
API 参考面板的悬浮卡片播放的是同一个视频。

## 8. 课程验证用的开发工具

`apps/xbuilder/pages/devtools/course-runner.vue`（仅开发环境的路由）

用程序驱动**真实**运行时——和用户跑的是同一个 WASM 引擎：

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // 或用 .load(owner, name) 从云端加载
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

**一条来之不易的约束被固化进了它的设计：** 每次运行都会起一个引擎实例，在同一个页面会话里跑过几次之后，
后续运行会**静默失效**——对完全正确的代码报告「没捡到」。**只有每个页面会话的第一次运行是可信的。**
`?autorun=<同源脚本>` 这个参数就是为此而存在的：让批量驱动脚本能在关卡之间重新加载页面并续跑。

这个特性曾在开发中途导致一个错误结论（「`repeat` 和 `var` 在 spx 里不能用」），并且撑过了好几轮排查才被推翻。
**一个自身可靠性未经验证的验证工具，没有资格给任何问题下结论。**

## 一些小东西

- 筛选把 API 列表收窄成真子集时，分类侧边栏自动隐藏
- 「重新开始本课」，以及「学习下一课」现在会走完整的开场序列
- 导航栏课程菜单里显示当前引导等级（`引导：关/低/高`）
- 每轮提醒用的 context provider（`criticalContext`），在上下文截断时不会被裁掉
- 编辑器的离开确认、重新加载扩展点

## 测试覆盖

那些容易回归的机制都配了单元测试：干预层级与判定计数、各层级的工具注册、课程配置解析、
内容可见性、尺子的角度数学、工作区布局重置、代码引导，以及开场/课程启动流程。
