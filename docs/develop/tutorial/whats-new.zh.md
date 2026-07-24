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

## 4. 课程作者声明的配置

`tutorials/course-config.ts`、`editor/workspace-layout.ts`、`tutorials/TutorialRoot.vue`

课程在提示词开头用一个 ```jsonc 块声明自己的配置，它由**前端在课程启动的瞬间读取并应用**——不经过 copilot、没有延迟：

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"], // 简化 UI
  "copilot": "open",                              // 开场是否展开面板（默认收起、后台运行）
  "judge": "code",                                // 完成判定：code（默认，看运行输出）/ copilot
  "complete": { "log": "捡到萝卜", "count": 4 },   // code 判定的完成信号（见下）
  "apis": ["step", "turn"],                       // 开场把 API 面板收窄到这些（全课并集）
  "opening": [                                    // 有序的编辑器内开场（见第 7 节）
    { "prelude": "..." }, { "video": "step" }, { "spotlight": { "ui": "Run button" }, "tip": "..." }
  ]
}
```

这套开场布置从前只能靠 copilot 在开场回复里现做——一次工具往返加一次生成，面板要过好几秒才收窄、视频常砸在用户操作中途。现在它是**静态数据、t=0 即生效**；声明了 `apis` / `opening`（或旧的 `videos`）的课程，copilot 的开场协议随之变为**纯静默**（只回进度判定 + `<stay-silent/>`，零工具往返）。API 条目可写裸名（`step`）、点名（`Sprite.step`）或完整 definition id，语言结构用规范名（`if_statement`、`for_iterate` 等）。

**完成判定（`judge` + `complete`）：**
- `code`（首选）：完成能从运行输出看出来。前端直接判定，成功弹窗**即时**弹出（不等 LLM），copilot 随后收到「Course completed」事件补一句评语。信号是 `complete: { log, count }`——单次运行内包含 `log` 的**不同**输出行达到 `count` 条即完成（适合“收集 N 个”，项目每达成一步打一行日志）；不写则回落到项目自打的完成哨兵 `@@builder:course-complete@@`。

  评语被明确告知去向（弹窗的评语区——隐藏事件轮里的正文到不了任何别的地方），且有双重保护不被事件抢占：**copilot 产出的可见工件（成功弹窗、开场弹窗）在屏上期间，环境事件一律丢弃**（编辑器感知、页面/模态框噪音——包括成功弹窗自己触发的「Modal opened」），写评语的轮次不会被任何东西中止；万一仍有轮次被取代，弹窗也会从**最终承载评语的那一轮**取值，而不是空等到超时兜底。
- `copilot`：完成无法从输出判断时（如“给 copilot 发一条消息”、“必须改用了某种写法”）由 copilot 宣布，代价是一次 LLM 往返。

作者手册见 `docs/product/course-authoring.zh.md`。

## 5. 尺子

`editor/preview/stage-viewer/StageRuler.vue`、`ruler-math.ts`

一个只在课程中出现的舞台工具：拖拽测距，端点会吸附到精灵中心。
当测量的**起点落在精灵上**时，它还会读出**转向角度**——带符号，所以那个数字正是 `turn` 需要填的值
（右转为正、左转为负，与 `Left = -90` / `Right = 90` 一致）。

正是它让「有多远？」和「该往哪转？」变成**可以量出来**的，而不是靠猜。第 3、8、9 课都建立在它之上。

## 6. copilot 的呈现方式

`CopilotUI.vue`、`CopilotChat.vue`、`editor/copilot/EditorCopilot.vue`、`copilot.ts`

copilot 的**状态是全局单例**（`CopilotRoot` 里 `provide` 出去的），但**呈现拆成一个共享会话体 + 两个壳**：
- `CopilotChat.vue` —— 共享的会话主体（轮次列表、快捷输入、欢迎屏、输入框、拖拽把手）；
- `CopilotUI.vue` —— 全局悬浮壳（首页/社区/普通编辑器），可拖拽贴边；
- `editor/copilot/EditorCopilot.vue` —— 教程聚焦模式下**编辑器自有**的停靠壳，活在代码列右下角的控件行里，面板用纯 CSS 布局浮在触发器上方——不再靠“量视口坐标喂给全局浮层”。

两个壳 inject 同一个 copilot 实例，所以从悬浮切到停靠，**会话无缝延续**。Run/Stop 控件用编辑器内 `<Teleport>` 送进同一控件行（runner 逻辑仍在预览组件里）。停靠面板历史可滚动、高度可拖拽；生成中时触发器中央的 C 徽标旋转，**面板收起也照转**。

课程**后台优先启动**：`Topic.autoOpenOnEvents = false` 意味着环境类事件（页面跳转、模态框）
永远不会弹开面板——**包括页面刷新时触发的跳转事件**，那个曾经让面板在课程中途自己冒出来。
主题就是 copilot 本身的课程，用 `"copilot": "open"` 来豁免。

教程话题会设置 `hideCodeInChat`：带代码的元素照常驱动编辑器内的引导，但在聊天里把代码渲染成不可选中的
——**看得见，抄不走**。

## 7. 开场序列

`course-start.vue`、`TutorialStoryVideoModal.vue`、`TutorialPreludeModal.vue`、`ApiVideoModal.vue`、`api-videos.ts`、`course-config.ts`、`TutorialRoot.vue`、`utils/spotlight/*`、`utils/radar`

故事视频（系列世界观）仍在**进编辑器之前**播；其后的一切收进一个**有序、作者声明的 `opening` 序列**，由前端在编辑器就绪后逐步播放（见第 4 节）——引导语 / 知识点视频 / 高亮，严格按书写顺序，一个游标在「继续 / 关闭 / 点掉」时前进。这取代了旧的「视频 → prelude」固定顺序和进编辑器前的 `<course-prelude>` 弹窗（prelude 现内联进 `opening`；故事视频仍用标签，因为它先于编辑器、且自带来源校验）。

**高亮**步骤指出「下一步该点的那一个东西」——按 Radar 名指界面地标（`Radar.getNodeByName`，如 `"Run button"`、`"Ruler"`），或按 definition id 指 API 参考项（给条目加了 `data-def-id`，用与 `apis` 同一个 `createCourseApiMatcher` 匹配）——用户点击任意处即前进（给 `Spotlight` 加了 `concealed` 事件）。目标晚挂载会重试、再跳过，写错的引用不会卡住开场。

API 视频按 definition id 索引，并按用户记录已学过的，所以**同一个概念不会被讲第二遍**；API 参考面板悬浮卡片播放的是同一个视频（弹窗抽成共享的 `ApiVideoModal`）。外部托管（如 S3）的视频用 `<video crossorigin>` 通过站点的 COEP；故事视频有 origin 白名单（同源 + usercontent CDN + 教程资源域名），`<course-story-video>` 可指向它。

## 8. 课程验证用的开发工具（这是为了方面Agent在本地开发课程的时候进行调试）

`apps/xbuilder/pages/devtools/course-runner.vue`（仅开发环境的路由）

用程序驱动**真实**运行时——和用户跑的是同一个 WASM 引擎：

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // 或用 .load(owner, name) 从云端加载
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

## 聚焦编辑器（对齐设计稿）

`EditorPreview.vue`、`stage-viewer/StageViewer.vue`、`ui/icons/ruler.svg`、`api-reference/*`、`input-helper/*`

- **API 参考卡片**：贴合签名内容；**面板宽度跟随最宽卡片**（`max-content` + 上下限钳制），右缘**可拖拽调宽**——拖过即手动接管、双击把手恢复自适应；超限时列表横向滚动。过滤收窄列表时，小分类标题与分隔线随分类侧边栏一并隐藏——几张精选卡片不需要脚手架。
- **尺子按钮**：白色卡片，hover/测量中变青色（`#eaf9fa` 底 + `#36c2cf` 图标），换成斜置尺子字形；tooltip 仅 hover 出现。**运行中原位保留为不可用态**（灰图标 + 红色斜线）而不是消失——能用的运行时尺子需要引擎暴露实时精灵变换。
- **运行画面与编辑舞台精确重合**：runner 被约束在（非 4:3 的）聚焦容器内"最大视口比例内接矩形"里——与编辑舞台同一套信箱数学——进出运行不再发生偏移。
- **Run/Stop**：白框内嵌实色胶囊（青色运行 `#36c2cf` / 红色停止 `#ef4149`），同一按钮切换。
- **输入助手按类型开关**（块样式）：纯字面量（整数/小数/字符串/布尔）不显示铅笔与 hover 的「修改」，选择器类（方向/颜色/按键/特效/资源…）保留（`isInputHelperHidden`，由 `SpriteEditor`/`StageEditor` 在聚焦模式下传入隐藏类型集）。

## 一些小东西

- 筛选把 API 列表收窄成真子集时，分类侧边栏自动隐藏
- 「重新开始本课」，以及「学习下一课」现在会走完整的开场序列
- 导航栏课程入口做成药丸样式（青色胶囊包图标，打开控制中心时按钮转灰）；导航栏课程菜单里显示当前引导等级（`引导：关/低/高`）
- 控制中心的「返回」回到**本系列**页面（`/course-series/:id`），而不是教程首页
- modal 打开时能正确盖住 copilot 与运行控件（把它们的 z-index 归入正常层级、低于 modal）
- 每轮提醒用的 context provider（`criticalContext`），在上下文截断时不会被裁掉
- 编辑器的离开确认、重新加载扩展点
