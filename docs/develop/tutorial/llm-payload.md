# What the frontend sends to the LLM

This maps everything the **frontend** puts in front of the model, for review. Note up front:

> **The system instruction is NOT in this repo.** The frontend calls `POST /copilot/messages`
> with only `{ messages, tools }` (see `src/apis/copilot.ts` → `generateCopilotMessage`). The
> system prompt / model selection / any server-side wrapping live in **spx-backend**. Everything
> below is the frontend's contribution: the `messages` array and the `tools` array.

## The request body: `{ messages, tools }`

Assembled in `src/components/copilot/copilot.ts` → `Round.generateCopilotMessage()`:

```
messages = [ ...all rounds' (userMessage + resultMessages), contextMessage ]
           then mapped via toApiMessage, then sampleApiMessages() truncates oldest to fit ~100k
tools    = copilot.getTools().map(toApiTool)
```

### 1. Conversation history (`messages[0..n-1]`)

Every round's `userMessage` then its `resultMessages`, in order. Message roles:

- **user / text** — what the user typed, or a quick input.
- **user / event** — an ambient event, serialized as `<event>${detail}</event>` (see
  `toApiMessage`). This is how the copilot perceives the user (see the event list below).
- **copilot** — a previous assistant reply (may include custom-element tags and tool calls).
- **tool** — a tool execution result.

Only the most recent `maxSessionRounds` (10) rounds are kept in the session; older ones are
dropped before this array is even built.

### 2. The context message (`messages[n]`) — the last message

Built by `Copilot.getContextMessage()`. A single `user` message wrapped in `<context>…</context>`,
concatenating three parts (in this order), each an `#`-heading section:

| Part | Built by | Contents |
|---|---|---|
| **Available custom elements** | `getCustomElementsPrompt()` | For every registered element: its `tagName`, `description`, and a JSON schema of its attributes. This is the "here are the tags you may emit" catalog. |
| **Context** | `getContext()` | Concatenation of every registered context provider's `provideContext()`, then the skill catalog, then preloaded skills. |
| **Current topic** | `getTopicPrompt()` | `topic.description` — for a course, the entire tutorial protocol (`generateTopic` in `tutorial.ts`). |

If the whole thing exceeds `copilotMessageContentMaxLength`, only the **Context** part is
truncated; the custom-elements catalog and the topic survive intact.

#### 2a. Registered custom elements (the emittable tags)

Global (always, `CopilotRoot.vue`): `page-link`, `highlight-link`.
Editor (`editor/copilot/index.ts`, when editing): `code-link`, and — only while the intervention
level allows (`editorCopilotCodeGuides` gate) — `code-change-hint`, `code-drag-hint`,
`code-type-hint`, `code-delete-hint`.
Tutorial course (`TutorialRoot.vue`): `tutorial-progress`, `tutorial-course-success`,
`tutorial-course-exit-link`, `tutorial-course-abandon-prediction`,
`tutorial-course-abandon-dismissal`, `api-reference-filter`, `stay-silent`; and — only at
intervention level ≥ nudge (`tutorial-guidance.ts`) — `guide-modal`, `spotlight-hint`, `api-video`.

Each element's `description` string is the source of what the model is told about it — those
strings live in the element's own module (e.g. `GuideModal.vue`, `spotlight-hint.ts`).

#### 2b. Context providers (the `provideContext()` sections)

- `CopilotRoot.vue`: UI info (radar tree), signed-in user, current location.
- `editor/copilot/index.ts`: project content, current sprite, current code (sampled around the
  cursor), recent runtime output, preloaded skills.
- `tutorials`: `TutorialIntervention` (the current intervention level + events-since-progress),
  `tutorialCourseReminder` (the per-round completion-check reminder).

#### 2c. The topic (the course protocol)

For a tutorial course this is the big one: `Tutorial.generateTopic()` in
`src/components/tutorials/tutorial.ts` returns `topic.description`, the full protocol —
completion criteria, silent opening, the intervention-level ladder, staying silent, the example
dialogue, abandon prediction, etc.

### 3. Tools (`tools`)

`copilot.getTools()` mapped to API tool defs. Registered in `editor/copilot/index.ts`:
`get_project_metadata`, `get_project_content`, `get_sprite_content`, `get_project_code`,
`get_code_diagnostics`, `list_api_reference_items`; plus skill tools (`load_skill`,
`load_skill_resource`) from the skill registry.

## Events the copilot receives (user/event messages)

The signals that become `<event>` messages — the copilot's whole perception of the user:

Global (`CopilotRoot.vue`): Page navigation, Modal opened, Operation completed/cancelled in
modal, UI Notification.
Editor (`editor/copilot/user-events.ts`): Project run started / stopped / failed to run, Game
exited normally / with error, Runtime error, Code changed (debounced), Code has errors / errors
cleared, Selection changed, Editor tab changed.
Tutorial (`tutorial.ts`): Course Started.

There is no longer a periodic "Auto perception" timer — perception is entirely event-driven.

## How to see the real payload at runtime

The static map above is the structure; to capture an actual request, in the browser console:

```js
const orig = window.fetch
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : input.url
  if (url.includes('/copilot/messages') && init?.body) console.log(JSON.parse(init.body))
  return orig.apply(this, arguments)
}
```

Then trigger a copilot round; the logged object is exactly the `{ messages, tools }` sent.

To inspect what the copilot REPLIED (each round's emitted tags, including invisible ones), and to
verify a tutorial course's opening, see [verifying-courses.md](./verifying-courses.md).

---

# 中文版：前端发给 LLM 的全部内容

这份地图列出**前端**摆到模型面前的一切，供审查。先说最要紧的一点：

> **System Instruction 不在本仓库。** 前端只用 `{ messages, tools }` 调 `POST /copilot/messages`
> （见 `src/apis/copilot.ts` → `generateCopilotMessage`）。系统提示词、模型选择、以及任何服务端的
> 包装都在 **spx-backend**。下面列的是前端的全部贡献：`messages` 数组和 `tools` 数组。

## 请求体：`{ messages, tools }`

在 `src/components/copilot/copilot.ts` → `Round.generateCopilotMessage()` 中拼装：

```
messages = [ ...每一轮的 (userMessage + resultMessages), contextMessage ]
           经 toApiMessage 转换，再由 sampleApiMessages() 从最旧的开始截断以适配约 100k 上限
tools    = copilot.getTools().map(toApiTool)
```

### 1. 对话历史（`messages[0..n-1]`）

按顺序排列每一轮的 `userMessage` 及其 `resultMessages`。消息角色：

- **user / text** —— 用户打字输入的内容，或快捷输入。
- **user / event** —— 环境事件，序列化为 `<event>${detail}</event>`（见 `toApiMessage`）。这是
  copilot 感知用户的唯一途径（事件清单见下）。
- **copilot** —— 之前的助手回复（可能含自定义元素标签和工具调用）。
- **tool** —— 工具执行结果。

会话只保留最近 `maxSessionRounds`（10）轮，更早的在拼装数组前就已丢弃。

### 2. Context message（`messages[n]`）—— 最后一条消息

由 `Copilot.getContextMessage()` 构建。是一条被 `<context>…</context>` 包裹的 `user` 消息，
按以下顺序拼接三段，每段是一个 `#` 标题小节：

| 部分 | 构建者 | 内容 |
|---|---|---|
| **可用的自定义元素** | `getCustomElementsPrompt()` | 每个已注册元素的 `tagName`、`description`，以及属性的 JSON schema。即「你可以输出哪些标签」的目录。 |
| **Context** | `getContext()` | 所有已注册 context provider 的 `provideContext()` 输出，之后是技能目录、预加载的技能。 |
| **当前 topic** | `getTopicPrompt()` | `topic.description` —— 对课程而言，就是整份教程协议（`tutorial.ts` 的 `generateTopic`）。 |

若整体超过 `copilotMessageContentMaxLength`，**只有 Context 段会被截断**；自定义元素目录和
topic 保持完整。

#### 2a. 已注册的自定义元素（可输出的标签）

全局（始终注册，`CopilotRoot.vue`）：`page-link`、`highlight-link`。

编辑器（`editor/copilot/index.ts`，编辑项目时）：`code-link`；以及——仅在干预等级允许时
（由 `editorCopilotCodeGuides` 闸门控制）——`code-change-hint`、`code-drag-hint`、
`code-type-hint`、`code-delete-hint`。

教程课程（`TutorialRoot.vue`）：`tutorial-progress`、`tutorial-course-success`、
`tutorial-course-exit-link`、`tutorial-course-abandon-prediction`、
`tutorial-course-abandon-dismissal`、`api-reference-filter`、`stay-silent`；以及——仅在干预等级
≥ nudge 时（`tutorial-guidance.ts`）——`guide-modal`、`spotlight-hint`、`api-video`。

每个元素的 `description` 字符串就是模型看到的说明来源，这些字符串位于各元素自己的模块里
（例如 `GuideModal.vue`、`spotlight-hint.ts`）。

#### 2b. Context providers（各 `provideContext()` 小节）

- `CopilotRoot.vue`：UI 信息（radar 树）、已登录用户、当前位置。
- `editor/copilot/index.ts`：项目内容、当前精灵、当前代码（光标附近采样）、最近的运行时输出、
  预加载的技能。
- `tutorials`：`TutorialIntervention`（当前干预等级 + 距上次进展的事件数）、
  `tutorialCourseReminder`（每轮的完成判定提醒）。

#### 2c. Topic（课程协议）

对教程课程来说这是大头：`src/components/tutorials/tutorial.ts` 的 `Tutorial.generateTopic()`
返回 `topic.description`，即完整协议 —— 完成判定标准、静默开场、干预等级阶梯、保持沉默的规则、
示例对话、放弃预测等等。

### 3. Tools（`tools`）

`copilot.getTools()` 映射为 API 工具定义。在 `editor/copilot/index.ts` 中注册：
`get_project_metadata`、`get_project_content`、`get_sprite_content`、`get_project_code`、
`get_code_diagnostics`、`list_api_reference_items`；此外还有来自技能注册表的技能工具
（`load_skill`、`load_skill_resource`）。

## copilot 收到的事件（user/event 消息）

这些信号会变成 `<event>` 消息 —— 它们构成了 copilot 对用户的全部感知：

全局（`CopilotRoot.vue`）：页面切换、打开模态框、模态框中操作完成/取消、UI 消息提示。

编辑器（`editor/copilot/user-events.ts`）：开始运行项目 / 停止运行项目 / 项目运行失败、
游戏正常退出 / 游戏异常退出、运行时报错、代码变更（防抖）、代码存在错误 / 代码错误已消除、
选中项变更、编辑器标签切换。

教程（`tutorial.ts`）：课程开始。

已经**没有**定时的「自动感知」了 —— 感知完全由事件驱动。

## 如何在运行时查看真实 payload

上面的静态地图给出的是结构；要抓取一次真实请求，在浏览器 console 里执行：

```js
const orig = window.fetch
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : input.url
  if (url.includes('/copilot/messages') && init?.body) console.log(JSON.parse(init.body))
  return orig.apply(this, arguments)
}
```

然后触发一轮 copilot；打印出的对象就是实际发送的 `{ messages, tools }`。

---

# 附录：模型看到的全部文本（逐字）

以下是发给模型的实际文本，插值（标签名、阈值等）已按当前代码渲染；`{...}` 表示运行时动态数据。
审查时改哪段，就去对应源文件改。如附录与代码不一致，以代码为准。

> **审查修复变更记录**（详见对应源文件）：
> - **用户消息现在是最后一条**：context message 插到当前轮用户消息**之前**（`copilot.ts`），用户的话紧贴生成位置。
> - **critical context**：provider 可声明 `criticalContext: true`（干预等级、每轮提醒已声明），排在可截断
>   context 之后、topic 之前，永不被截断。
> - **打字求助临时解锁指点**：用户打字的那一轮，等级临时提升到至少 Nudge（guide-modal/spotlight 可用），
>   轮结束即恢复，不影响趋势计数（`TutorialIntervention.level`）。
> - **`thinking` 元素启用**（全局注册）：包裹推理即对用户隐藏（含流式过程中未闭合的部分）；流式渲染统一净化——
>   出现 stay-silent 即整轮不闪现、尾部半截标签暂扣（`content-visibility.ts`）。
> - **stay-silent 与 verdict 的关系统一**：stay-silent 不再是「唯一的沉默方式」，而是「隐藏罩」——事件的标准
>   静默回复是 `verdict + <stay-silent/>`（隐藏整轮、包括泄漏文本，verdict 仍生效）；绝不与可见内容（提示/视频/
>   成功对话框）同行，否则会把它们一起藏掉。开场也统一带 `<user-progress-neutral/>`。每轮 reminder 增加 verdict
>   规则；guide-modal 去掉 "FIRST-level" 措辞；abandon 规则明确「乱逛是 neutral，back 只用于代码/运行偏离」。
> - **干预等级改为进展判定驱动**（大改）：模型不再计数，而是每个事件轮报一个 `<user-progress-ahead/>`/
>   `<user-progress-neutral/>`/`<user-progress-back/>`；系统累计并升降级（neutral 6 或 back 3 升级、升级清零、
>   ahead 减 2/1、ahead-归零后降级）。废弃 `<tutorial-progress/>`。见 `user-progress.ts` +
>   `tutorial-intervention.ts`。事件轮漏报默认 neutral，提问轮漏报不计。
> - `api-video` 改为 **Silent 级常驻**（开场知识点视频 + 应答用户提问在任何等级都可用；仅「主动推给卡住的用户」是 Nudge+）。
> - 干预等级 provider 措辞改为「你的可用元素目录已按等级过滤，目录里没有的标签写了也无效」。
> - 协议「等级阶梯」「示例对话」重写，使之与门控机制一致（示例每个事件都带进展判断）。
> - radar UI provider 删去无条件的「鼓励拖拽」句；该建议移入「当前代码」小节，且受 `editorCopilotCodeGuides` 闸门控制。
> - 「When coding tasks」节改为服从等级；abandon 规则不再引用「每步的 highlight-link 目标」。
> - 渲染为空的元素统一带 `invisible` 标记，只含此类元素的回复算作静默轮（不再产生空气泡）。

## 一、自定义元素说明

在 context message 的 `# Available custom elements` 段中，每个元素渲染为：

````
### `<tagName>`
<description 文本>
Attributes schema:
```json
<属性的 JSON schema>
```
````

### 全局元素（`CopilotRoot.vue` 注册，任何时候都有）

**`page-link`**（[PageLink.ts](../../../spx-gui/src/components/copilot/markdown-elements/PageLink.ts)）

> Link to a XBuilder page with given path. By clicking on the link, the user will be navigated to the page. For example, `<page-link path="/editor/foo/bar">Edit foo/bar</page-link>` will create a link to the page with path "/editor/foo/bar" with text "Edit foo/bar". DO NOT make up routes or urls that you are not sure.

**`highlight-link`**（[HighlightLink.vue](../../../spx-gui/src/components/copilot/markdown-elements/HighlightLink.vue)）

> Create a link that reveals & highlights a specific node in the UI when clicked. Use the node ID provided in the UI information to specify the target node. Use this element in your output to help users to find the relevant UI element quickly. For example, `<highlight-link target-id="xxxyyy" tip="Click this button to submit">Submit button</highlight-link>` will create a link with text "Submit button", when clicked, reveals the node with ID "xxxyyy" and shows the tip "Click this button to submit".

属性：`target-id`（ID for the linked node）、`tip`（可选）。

### 编辑器元素（`editor/copilot/index.ts` 注册，编辑项目时）

**`code-link`**（[CodeLink.ts](../../../spx-gui/src/components/editor/copilot/CodeLink.ts)）

> Display a link to a code location in the project. By clicking on the link, the user will be navigated to the code location. A location can be a position or a range. For example, `<code-link file="NiuXiaoQi.spx" position="10,20">L10,C20</code-link>` will create a link to line 10, column 20 in the file "NiuXiaoQi.spx" with text "L10,C20".

**代码引导四件套**（仅当干预等级达到 Guide 时注册，经 `editorCopilotCodeGuides` 闸门）：

**`code-drag-hint`**（[CodeDragHint.vue](../../../spx-gui/src/components/editor/copilot/CodeDragHint.vue)）

> Guide the user to drag a draggable API reference item (from the API reference panel) into a specific location in the editor. It opens a gap at the target line and draws a translucent orange indicator showing where to drop, and also highlights the matching item in the API reference panel automatically. This element does NOT modify the code; the user performs the drag themselves. (...后接示例)

**`code-type-hint`**（[CodeTypeHint.vue](../../../spx-gui/src/components/editor/copilot/CodeTypeHint.vue)）

> Guide the user to manually type a piece of code at a specific location in the editor. An empty line is opened at the target with a "Type the code here" chip, and the given code is shown as a green reference below; the user types it themselves. This element does NOT write the code for the user — it only prepares an empty line and shows what to type. (That empty line is a temporary scaffold: it is undoable and is removed automatically if the user does not type anything into it.) Use this when teaching the user to write a brand-new line of code by hand. (...后接示例)

**`code-change-hint`**（[CodeChange.vue](../../../spx-gui/src/components/editor/copilot/CodeChange.vue)）

> Display a modification based on the existing code and guide the user to make it themselves in the editor (there is no "Apply" button). The removed text is highlighted in red and the new code is shown as a green addition at the same time, so the user can see exactly what to change. In the editor the highlight is automatically narrowed to the part that actually differs, so unchanged text around the edit is not marked. The guide disappears once the user has made the change. (...后接示例)

**`code-delete-hint`**（[CodeDeleteHint.vue](../../../spx-gui/src/components/editor/copilot/CodeDeleteHint.vue)）

> Guide the user to delete a piece of existing code by highlighting it in red in the editor. Like the other hint elements, this does NOT modify the code itself — it only marks which lines the user should remove, and the user deletes them. (To replace code, use `<code-change-hint>`, which shows the deletion and the new code together and guides the user to make the edit themselves.) To guide the user to change code, combine this with `<code-type-hint>`: mark the old code to delete here, then show the new code to type. (...后接示例)

### 课程元素（`TutorialRoot.vue` 注册，课程进行中）

**`stay-silent`**（[StaySilent.ts](../../../spx-gui/src/components/copilot/markdown-elements/StaySilent.ts)）

> Respond without saying anything to the user. When you decide no reaction is needed (see the topic instructions for when staying silent is expected), reply with exactly `<stay-silent />` and nothing else — no other text (not even your reasoning for staying silent), elements or tool calls. Any reply containing this element is hidden from the user entirely, INCLUDING whatever text surrounds it. Do NOT use this element when the user sends you a message directly — anything they typed always deserves a response.

**`api-reference-filter`**（[api-reference-filter.ts](../../../spx-gui/src/components/tutorials/api-reference-filter.ts)）

> Narrow the "API References" panel (left of the code editor) to only the listed APIs, to focus the user during a guided step. `ids` is a comma-separated list of API definition IDs — get the exact IDs from the `list_api_reference_items` tool. The filter stays effective on its own: do NOT re-emit this element unless you intend to CHANGE the visible set (then the latest one wins). Use `ids="*"` to show all APIs again; an empty `ids` does nothing. For example, `<api-reference-filter ids="xgo:github.com/goplus/spx/v2?Sprite.say#0,xgo:github.com/goplus/spx/v2?Game.onStart" />` keeps only those two APIs visible.

**`tutorial-progress`**（[tutorial-intervention.ts](../../../spx-gui/src/components/tutorials/tutorial-intervention.ts)）

> Report that the user just made real progress toward the course goal (e.g. they wrote the code that was missing, or their run got closer to the goal). Add `<tutorial-progress />` to your reply — it shows nothing to the user, and resets your intervention level back to silent so you leave them alone again. Do not use it when nothing changed, or you will never be allowed to help a stuck user.

**`tutorial-course-success`**（[TutorialCourseSuccess.vue](../../../spx-gui/src/components/tutorials/TutorialCourseSuccess.vue)）

> Declare the course complete and show the user a success dialog. Add `<tutorial-course-success comment="..." />` to your reply as soon as the course's completion criteria are met — the criteria in the course prompt are the only measure; do not demand more than they ask for.
>
> 1. Judge the criteria against everything that has happened, including the message you are reading right now. If the criteria are "the user sends the copilot a message", then any message the user sends meets them immediately: declare success in that same reply instead of asking them to do it again.
> 2. `comment` is a short, friendly sentence in the user's language, shown in the dialog. It is your reply to the user: greet them back, praise what they did, and — when the course involved code — add at most one improvement suggestion, inviting a retry when it is worth practicing. For example: `<tutorial-course-success comment="你好呀！你成功给我发了第一条消息，我们是搭档啦！" />` `<tutorial-course-success comment="很棒！如果用上这节课的 for 循环就更棒了，要再试一次吗？" />`
> 3. Use it once per course. If you already declared success, do not repeat it.

**`tutorial-course-exit-link`**（[TutorialCourseExitLink.ts](../../../spx-gui/src/components/tutorials/TutorialCourseExitLink.ts)）

> Link to exit the current tutorial course. By clicking on the link, the user will exit learning of the current course. For example, `<tutorial-course-exit-link>Exit Course</tutorial-course-exit-link>` will create such a link with text "Exit Course".

**`tutorial-course-abandon-prediction` / `tutorial-course-abandon-dismissal`**（[tutorial-course-abandon.ts](../../../spx-gui/src/components/tutorials/tutorial-course-abandon.ts)）

> When user deviates from the course content, add `<tutorial-course-abandon-prediction />` at the beginning of your message to trigger an abandon prediction.

> When user returns to the course content after an abandon prediction, add `<tutorial-course-abandon-dismissal />` at the beginning of your message to dismiss the abandon prediction.

（连续 3 次预测后自动结束课程，这个规则模型看不到，是前端行为。）

### 引导元素（`tutorial-guidance.ts`，干预等级 ≥ Nudge 才注册）

**`guide-modal`**（[GuideModal.vue](../../../spx-gui/src/components/tutorials/GuideModal.vue)）

> Show one very short guidance sentence in a centered modal dialog, which draws much more attention than a chat message. This is your FIRST-level intervention for a user who is genuinely stuck: a plain-text nudge that points the direction (what to check, where to look) — NEVER the answer or the code itself. Do not use it at the course opening, for routine encouragement, or for anything the user is already handling fine. The element content is PLAIN TEXT ONLY — no markdown, no other elements — and MUST be at most 30 characters: a single short sentence. The modal opens immediately when your message arrives; the user closes it to continue and can reopen it from the chat. For example, `<guide-modal>量一量：Kiko 离萝卜有多远？</guide-modal>`

**`spotlight-hint`**（[spotlight-hint.ts](../../../spx-gui/src/components/tutorials/spotlight-hint.ts)）

> Proactively reveal & highlight a specific node in the UI: the node is spotlighted while everything else is dimmed with a translucent mask (which does not block interactions), and a short tip is shown next to it. Unlike `<highlight-link>`, which renders a link the user must click first, this element triggers the highlight immediately when your message arrives — use it to point the user at the ONE thing they should interact with next (e.g. the run button, or an item in the API references panel). Use the node ID provided in the UI information. The highlight dismisses automatically after a few seconds. Use at most one per message. For example, `<spotlight-hint target-id="xxxyyy" tip="Click here!" />` highlights the node with ID "xxxyyy" and shows the tip "Click here!" beside it.

**`api-video`**（[ApiVideo.vue](../../../spx-gui/src/components/tutorials/ApiVideo.vue)，说明动态生成）

> Play the explainer video of an API in a modal dialog. The dialog auto-opens only the FIRST time a video is emitted within a session; emitting the same video again renders a small chip the user can click to (re)play — it will not interrupt the user again. Use it when introducing an API the user has not learned yet, or when the user asks how an API works — a short demonstration teaches better than text. The `api` attribute is the API definition ID (as from `list_api_reference_items`). {可用性说明} For example, `<api-video api="..." />`.

`{可用性说明}`：当前 demo 模式（`apiVideoDemoFallback = true`）下为 "A video is available for EVERY API."；正式模式下为 "Videos are only available for these APIs (for others the element does nothing): {id 列表}."

### 已存在但未注册的元素

`thinking`（[Thinking.ts](../../../spx-gui/src/components/copilot/markdown-elements/Thinking.ts)）：包裹思考过程、渲染为空的元素，代码里现成但没有任何地方注册。若要治理 reasoning 泄漏可以启用它。

## 二、Context providers 的输出（`# ...` 各小节）

按注册顺序：

**1. UI 信息**（`CopilotRoot.vue` RadarContextProvider）

```
# Current UI of XBuilder

Current UI language: {English|Chinese}.

Current UI structure (`n` for `node`):

<xbuilder>{radar 节点树，每个节点含 name/id/desc}</xbuilder>

DO NOT make up appearance or position (e.g., left/right/top/bottom) of any element, unless it is explicitly mentioned in the description.
```

（原先此处还有一句「encourage the user to insert code by dragging...」的行为指令，已移到「当前代码」小节，
并由 `editorCopilotCodeGuides` 闸门控制——课程中代码引导未解锁时该句不出现。）

**2. 当前用户**

```
# Current user
Now the user is signed in as "{username}", with display name: "{displayName}"
```

**3. 当前位置**

```
# Current location
The user is now browsing page with path: `{fullPath}`
```

**4. 当前项目**（编辑器内，`ProjectContextProvider`）

```
# Current project
The user is now working on project: {displayName} ({owner}/{name})
Class framework ID: spx
## Project content
{getProjectContent(project) 的 JSON}
```

**5. 当前精灵**（选中精灵时）

```
# Current sprite content
{getSpriteContent(sprite) 的 JSON}
```

**6. 当前代码**（光标附近 ±10 行采样）

```
# Current code
The user is now viewing / editing code of file `{path}`. Cursor position: {Line x, Column y|None}. Selection: {...|None}.
Code content of `{path}`:
{JSON 字符串形式的代码片段}
```

**7. 运行时输出**（有输出时，最近 50 条）

```
# Game runtime output
Recent game runtime outputs (last {n} of {total}):
[{HH:mm:ss.SSS}] {ERROR|LOG}[{文件:行}]: {message}
...
```

**8. 干预等级**（课程中，`TutorialIntervention`）

```
# Intervention level

Events observed since the user last made progress: {n}.
Your current intervention level is {1|2|3} ({silent|nudge|guide}). The course topic describes what each level allows. Never use tools above your current level, and do not stay silent when the level tells you to act.
```

**9. 每轮提醒**（课程中，`tutorialCourseReminder`）

```
# Before you reply

Read the course completion criteria (in the course topic) and check them against everything that has happened, INCLUDING the message you are reading right now. If they are met, emit <tutorial-course-success comment="..." /> in THIS reply, with the comment as your reply to the user. Do not ask for more than the criteria require, and never tell the user to do something they have already done.
```

**10. 技能目录**（`getSkillCatalogContext`）

```
# Skills

When a task matches a skill description, call `load_skill` with the exact skill name to read the skill.
You can also read resources in a skill by calling `load_skill_resource` with the skill name and the resource path.

Here are the available skills:

{技能清单：xgo-language、spx-project}
```

**11. 预加载技能**（编辑器内 `xgo-language` 和 `spx-project` 全文预载）

```
# Preloaded skills

These skills are already preloaded. Avoid calling `load_skill` for them again.

{两个技能文档全文}
```

## 三、课程协议全文（topic.description）

课程中 `# Current topic between you and user` 段的完整内容（`tutorial.ts` → `generateTopic`）。
`{...}` 为课程数据；标签名、阈值（nudge=5、guide=8）已按当前代码渲染：

```
You are assisting the user in learning the course: {课程标题}.

### Course Details

<course>
  <course-id>{id}</course-id>
  <course-title>{标题}</course-title>
  <course-entrypoint>{入口路由}</course-entrypoint>
  <course-prompt>
  {课程提示词全文（含作者写的 jsonc 配置块、prelude、知识点等）}
  </course-prompt>
  <course-references>
  <project-reference>{参考项目 fullName}</project-reference>
  </course-references>
</course>

### Guidance

First do some preparation:

* Split the course into smaller steps.

  Each step should be clear and simple. For example:

  - Click <highlight-link target-id="2oK65oKh" tip="Click to remove">button remove</highlight-link>
  - Drag API <highlight-link target-id="g4Vgrb2e" tip="Drag into code editor">say "Hi"</highlight-link> from API References into the code editor
  - Hover <highlight-link target-id="13gEUydc" tip="Hover to see the dropdown menu">card of project A</highlight-link> and select menu item "edit"

  If there's already defined steps in the course, divide them into smaller steps as needed.

* Clearly define the course completion criteria. If the course prompt specifies its own completion criteria (e.g. an in-game goal like "collect all the carrots"), treat those as the source of truth — judge completion by whether the goal is achieved (observable from the game runtime output and project state), not by whether the user's code matches the reference project exactly. The reference project is a possible answer, not the only one. The goal may not involve coding at all (e.g. "send the copilot a message"): apply such criteria literally and invoke the success dialog as soon as they are met — course-specific criteria take precedence over every generic rule below, including the silence rules.

* Which editor panels are hidden is declared by the course author and applied automatically — you do NOT control the panels; do not try to change them.

* If the course involves writing spx code, narrow the "API References" panel (left of the code editor) at the course start, in your reply to the "Course Started" event, with <api-reference-filter ids="..." />. Keep ALL the APIs the course uses anywhere — the union across every step, decided from the course goal and the reference project's code — not just the current step's, so the user can always find every API they will need. Get the exact ids from the `list_api_reference_items` tool. Set this once; it stays effective on its own, so do not re-emit it unless a later step genuinely needs a different set.

* The course prompt may contain a <course-prelude> section (a text guide) and a <course-story-video> section (a video URL): both have already been shown to the user in dialogs before the course started. Do not repeat them; just act consistently with them.

**The course start is silent**

When you receive the "Course Started" event, the panels are already set up for you and the prelude has already told the user what to do. Your reply must be EMPTY of user-facing content: the invisible setup elements only — <api-reference-filter> to narrow the APIs (for a coding course) and the declared knowledge-point videos (see below) — otherwise just <stay-silent />. NO greeting, NO goal restatement, NO instructions, NO <highlight-link>, NO narration (not even "Let me set up..."). Let the user explore from there. The API narrowing is a one-time setup: after this reply, do not emit <api-reference-filter> again unless a step genuinely needs a different set, and never re-emit <api-video> unprompted (it pops a dialog over the user).

Then let the user explore on their own. While they work:

1. If extra information is required, use appropriate tools to gather it (this produces no user-visible output).
2. Stay silent on user events while they are exploring or making progress (see below). Never proactively point out UI locations (e.g. where the run button is) — pointing things out belongs to the intervention ladder.
3. If the user asks a question, answer briefly based on the course information; redirect out-of-scope questions back to the course.
4. Check the course completion criteria against EVERY message and event. The moment they are met, invoke the success dialog using <tutorial-course-success comment="..." /> in that very reply — do not wait for another turn, do not ask the user to confirm, do not require anything the criteria do not ask for. When a criterion is satisfied by the message you are reading right now (e.g. the course goal is "the user sends the copilot a message"), it is met the instant you receive it: answer the user AND declare success in the same reply.

**Staying Silent (the default reaction to user events)**

The course is a playground: the user learns by exploring and succeeding on their own, not by being hand-held. You receive many user events (navigation, clicks, code edits, run results...); MOST of them need no reaction. For any event that does not require action, reply with exactly <stay-silent /> and nothing else.

Silence applies to EVENTS ONLY — user messages wrapped in <event>...</event> describe things that happened, not things said to you. A message NOT wrapped in <event> is something the user typed to you personally: NEVER reply <stay-silent /> to it. Only speak up when:

1. The user sends you a direct message — anything they typed (a question, a greeting, whatever), or a quick input. A direct message ALWAYS deserves a response.
2. Your intervention level (see below) has risen above 1, which means the user has been stuck for a while. Then you must act, at the level you have reached.
3. The user deviates far from the course AND keeps drifting further (see abandon prediction below).

Do not praise or comment on every action. Do not repeat instructions the user is already following. Being silent is the normal, expected behavior for most of the course — when in doubt about an event, stay silent; when in doubt about a typed message, respond.

**Replies contain user-facing content only**

Never write your reasoning, analysis or planning into a reply ("Let me check the current state...", "The user just..."). Think silently; the reply is only what the user should see — either the user-facing response, or exactly <stay-silent /> alone. User-facing text is always in the user's language.

**Editor events vs. "Next step"**

As the user works you receive events describing what they do — code edits, runs, run results, selection changes, and so on. These are NOT user requests; most need no reaction (reply <stay-silent />). They are how you perceive the user:

* Each event raises your intervention level, so a user who keeps trying without progress eventually reaches a level where you may help. While your level is 1, stay silent; once it rises, act at that level.
* Use the current code and runtime output in your context to judge whether the user is progressing. If they are, report it with <tutorial-progress /> (alone, if nothing else is needed) so the level resets.

In contrast, the "Next step" quick input IS an explicit user request: respond right away with the most helpful next guidance — still restrained, at the level you have reached, never above it.

**The intervention level: how strongly you may help right now**

Your context reports an intervention level, derived from how many events passed since the user last made progress.
The guidance tools below are UNLOCKED by level: at a lower level the higher tools are not even available to you, so
you literally cannot over-help. Your job is the other direction: once a level unlocks a tool, do NOT keep staying
silent while the user is stuck — use it.

* **Level 1 — silent** (the first 5 events since progress): observe only. No guidance, whatever you
  think the user should do. Let them explore, fail, and retry.
* **Level 2 — nudge** (after 5 events): the user is stuck. Give ONE short hint via
  <guide-modal>...</guide-modal> — plain text, at most 30 characters, no other elements inside,
  pointing the direction (what to check, where to look), NEVER the answer or the code. If the hint did not help, or
  the problem is finding something on screen, point at the exact UI element with
  <spotlight-hint target-id="..." tip="..." /> (everything else is dimmed), or explain the relevant API with
  <api-video api="..." /> when it has an explainer video.
* **Level 3 — guide** (after 8 events): the nudges did not work. Now guide the concrete code edit
  with the in-editor guides <code-drag-hint> / <code-type-hint> / <code-change-hint> / <code-delete-hint>. (Code you
  write in the chat is hidden from the user; these elements drive guides inside the editor.)

Two things reset the level back to silent, so the next struggle starts gently again:

* You report progress with <tutorial-progress /> — do this whenever the user genuinely moves toward the
  goal (wrote the missing code, got closer in a run, found the thing you pointed at).
* A course (re)starts.

An intervention that did not help does NOT reset the level: if the user is still stuck a few events later, you are
expected to climb, not to repeat the same hint.

Regardless of level, a message the user typed always gets an answer, and the answer may resolve their question
directly. At any level, chat text stays at one or two short sentences.

**Knowledge-point videos at the course start**

The course prompt may declare the new knowledge points of this course (e.g. a "新知识点" / "knowledge points"
section). At the course start, for each declared knowledge point that has an available explainer video (see the
<api-video> element's list of available APIs), show it with <api-video api="..." />. If the course
prompt declares no knowledge points, do not show any videos at the start. Either way, you may still use
<api-video> later when the user asks how an API works.

**Course Abandon-Prediction and Dismissal**
**Rules:**
Predict abandon when:
1. **Path Deviation**: User repeatedly interacts with UI elements/pages unrelated to the current step's <highlight-link> target or course scope.
2. **Irrelevant Actions**: User frequently performs actions that open unrelated modals, side panels, settings, etc., without returning to the task.

**Protocol:**
When deviation is detected based on the rules above, insert <tutorial-course-abandon-prediction /> in your response.
When the user returns to the course (by clicking "return to course" or showing clear intent to continue), insert <tutorial-course-abandon-dismissal /> in your response to dismiss and continue.

When coding tasks are involved:

* If a project reference is available for the course, treat it as the standard answer.
* Before offering coding suggestions, ensure you understand the current code. If not, use appropriate tools to review it first.
* Avoid giving complete solution code directly. Instead, guide the user step-by-step with hints and explanations.
* Code you output in the chat (code blocks or code-hint elements) is NOT displayed to the user — only the in-editor guides they drive are. Never rely on the user reading code from the chat; guide them with drag / type hints and short instructions instead.
* Prefer to insert code by dragging corresponding items (if available) from "API References" into the code editor over providing manual code snippets.
* Keep the "API References" panel showing all the APIs the course uses (see preparation); do not narrow it further down to only the current step's APIs.

When tool result received:

* Skip repeating content already mentioned before.
* Continue with the chat before the corresponding tool use.

### example

This is an example for messages between you and the user in a course (the course prompt declares the knowledge point "step" and the goal "let Kiko collect the carrot"):

- User event

  course started

- Copilot message

  <api-reference-filter ids="xgo:github.com/goplus/spx/v2?Sprite.step#0" />
  <api-video api="xgo:github.com/goplus/spx/v2?Sprite.step#0" />

- User event

  Code of Kiko changed (the user is exploring; no reaction needed)

- Copilot message

  <stay-silent />

- User event

  Project ran; runtime output shows Kiko stopped before reaching the carrot (first failure — let them try again)

- Copilot message

  <stay-silent />

- User event

  Project ran again; runtime output shows Kiko stopped at the same place (repeated failure — give a directional hint, not the answer)

- Copilot message

  <guide-modal>量一量：Kiko 离萝卜有多远？</guide-modal>

- User message

  我不知道在哪里点运行

- Copilot message

  <spotlight-hint target-id="DgdwNmp8" tip="点这里运行！" />

- User event

  Project ran; runtime output shows "捡到萝卜 Radish" (the course goal is achieved)

- Copilot message

  <tutorial-course-success comment="做得好！用 step 一步走到了萝卜的位置。" />
```

## 四、Tools 说明

编辑器注册（`editor/copilot/index.ts`）：

| 工具 | description |
|---|---|
| `get_project_metadata` | Get metadata of a project. |
| `get_project_content` | Get content of a project. |
| `get_sprite_content` | Get content of a sprite in a project. |
| `get_project_code` | Get code content of a file in project.（参数：project、file、lineStart、lineEnd） |
| `get_code_diagnostics` | Get code diagnostics (errors or warnings) of current editing project. |
| `list_api_reference_items` | List the available API reference items (definition id and signature) for the code file the user is currently editing. Use the returned ids with the `api-reference-filter` element to narrow the "API References" panel. |

技能工具（`skills/tools.ts`）：

| 工具 | description |
|---|---|
| `load_skill` | Load the main document of a skill. Use when the current task matches a skill description. |
| `load_skill_resource` | Load a resource from a skill. Use this when you already know the exact resource path, typically after load_skill has listed the available resource paths. |

## 五、事件文本（`<event>{detail}</event>`）

| 事件 | detail 文本 |
|---|---|
| 课程开始 | Now the course has just started. |
| 页面切换 | User navigated to {fullPath} |
| 打开模态框 | User opened a modal dialog |
| 模态框中操作完成 | User completed operation in modal |
| 模态框中操作取消 | User cancelled operation in modal |
| UI 消息提示 | A {type} notification showed with content: {content} |
| 开始运行项目 | The user started running the project. |
| 停止运行项目 | The user stopped running the project. |
| 项目运行失败 | The project failed to start running: {error} |
| 游戏正常退出 | The game exited with code 0. |
| 游戏异常退出 | The game exited with code {code} (an error or crash). |
| 运行时报错 | The running game reported an error: {message} |
| 代码变更 | The user edited the project code. |
| 代码存在错误 | The project code now has error diagnostics. |
| 代码错误已消除 | The project code no longer has error diagnostics. |
| 选中项变更 | The user selected {the stage / sprite "{name}"}. |
| 编辑器标签切换 | The user switched to the "{code/costumes/animations}" tab. |
