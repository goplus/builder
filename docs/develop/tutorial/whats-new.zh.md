# 这个分支加了什么 

这次教程重构，把课程从**「copilot 照着念的教科书」**变成了**「copilot 在旁边看着的Playground」**。

## 设计

## 1. 干预层级

`tutorial-intervention.ts`、`tutorial-guidance.ts`、`user-progress.ts`

三个层级：**Silent(1) → Nudge(2) → Guide(3)**。每一级注册不同的自定义元素集合；
不可用的工具会被**取消注册**，尽可能避免模型难以评估一个长程session当前的状态的问题。

| 层级 | 存在哪些工具 |
|---|---|
| Silent | 只有 `api-video` |
| Nudge | `+ guide-modal`、`spotlight-hint` |
| Guide | `+ 所有编辑器内代码引导，包括code-change-hint、code-type-hint、code-drag-hint等` |

层级靠**进展判定**移动：每个事件轮次，模型都要报告
`<user-progress-ahead/>` / `<user-progress-neutral/>` / `<user-progress-back/>`。
系统对其计数（`neutralThreshold = 6`、`backThreshold = 3`）；一次 *ahead* 会抵消计数，
计数为0但用户仍然ahead时则触发降级。用户打字提问会临时把层级抬到至少 Nudge。

光靠提示词规则被证明是不可靠的。我们采用了：
**先机制**、**再每轮提醒**、**协议文字**
的组合方案。

## 2. 感知：增加感知事件

`editor/copilot/user-events.ts`

copilot 现在会感知更多的事件：运行开始/停止、游戏退出（任意退出码）、
**运行时输出**、防抖后的代码变更、诊断信息、精灵/标签页切换。

其中「运行时输出」这一条是关键：过关的信号本身就是一行日志，**只在报错时醒来意味着编程类课程永远无法在用户不点击Next Step的情况下完成**。

我们的设计逻辑是：“更积极的感知，更消极的干预”。并且我们取消了Next Step按钮。

## 3. 更少的干预

`copilot/markdown-elements/StaySilent.ts`、`copilot/content-visibility.ts`、`CopilotUI.vue`

`<stay-silent />` 会隐藏**整轮**内容，包括漏在它周围的推理文字。聊天窗口里**只显示用户打字的轮次**——
事件驱动的轮次在后台无形地跑。被取消的事件轮次也一并跳过（用户继续编辑会中止在途的轮次，那不是该展示的东西）。

## 4. 课程作者声明的工作区

`tutorials/course-config.ts`、`editor/workspace-layout.ts`

课程在提示词里用一个 ```jsonc 块声明自己的工作区（如何简化UI）：

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  "copilot": "open"
}
```

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

## 8. 课程验证用的开发工具（这是为了方面Agent在本地开发课程的时候进行调试）

`apps/xbuilder/pages/devtools/course-runner.vue`（仅开发环境的路由）

用程序驱动**真实**运行时——和用户跑的是同一个 WASM 引擎：

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // 或用 .load(owner, name) 从云端加载
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

## 一些小东西

- 筛选把 API 列表收窄成真子集时，分类侧边栏自动隐藏
- 「重新开始本课」，以及「学习下一课」现在会走完整的开场序列
- 导航栏课程菜单里显示当前引导等级（`引导：关/低/高`）
- 每轮提醒用的 context provider（`criticalContext`），在上下文截断时不会被裁掉
- 编辑器的离开确认、重新加载扩展点
