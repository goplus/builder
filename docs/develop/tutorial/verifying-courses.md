# 在运行时验证一门课程

一套快速检查课程行为是否正确的方法——不用把每个对话框都点一遍，而且能看到 copilot 发出的
那些**不可见**的东西（`api-reference-filter`、`user-progress-*`、`stay-silent`），它们永远不会显示在屏幕上。

诀窍在于：整个 copilot 会话都被持久化到了 `sessionStorage`（节流写入，约 300ms 一次），
所以你可以直接从存储里读出每一轮 copilot 究竟回复了什么。

## 导出 copilot 会话

在浏览器控制台里粘贴（课程进行中或结束后都行）：

```js
function dumpCopilotSession() {
  const raw = sessionStorage.getItem('spx-gui-copilot-session')
  if (raw == null) return '(no copilot session)'
  const parsed = JSON.parse(raw)
  // 存的值是按用户隔离的：{ __user__, __value__: <session> }
  const session = parsed?.__value__ ?? parsed
  if (session?.rounds == null) return '(empty session)'
  return {
    topic: session.topic?.title?.zh ?? session.topic?.title?.en,
    rounds: session.rounds.map((r) => ({
      trigger:
        r.userMessage.type === 'event'
          ? `event: ${r.userMessage.name.en}`
          : `typed: ${r.userMessage.content}`,
      state: r.state,
      reply: r.resultMessages
        .filter((m) => m.role === 'copilot')
        .map((m) => m.content ?? '(tool call)')
        .join(' ')
    }))
  }
}
console.log(JSON.stringify(dumpCopilotSession(), null, 2))
```

每一轮会显示它的 `trigger`（事件名，或用户输入的文字）、轮次状态 `state`
（`completed` / `loading` / `cancelled` / `failed`），以及 copilot 的原始回复 `reply`——连标签一起。

## 一次健康的课程开场长什么样

第一轮应该是 `event: Course Started`、`state: completed`，而且它的回复里**只有不可见的 setup 元素**——
没有问候语、没有课程名、没有旁白。以一门编程课为例：

```
<api-reference-filter ids="..." />       ← 把 API 面板收窄到本课的 API
<api-video api="..." />                   ← 每个声明的知识点一个（开场视频）
<user-progress-neutral />                 ← 第一个进展判定
```

对照课程提示词检查：`ids` 应当和课程的 API 列表一致，`api-video` 应当和声明的知识点一致。
非编程类的课程可能只有 `<user-progress-neutral />`（外加 `<stay-silent />`）。

## DOM 快速检查（在编辑器里）

```js
({
  // 筛选生效时分类侧边栏是隐藏的（见「隐藏分类侧边栏」那个改动）
  categorySidebarHidden: document.querySelector('section[class*="min-h-0"] > ul.flex-none') == null,
  apiItemCount: document.querySelectorAll('.api-reference-item').length,
  editorLoadFailed: document.body.innerText.includes('Failed to load'),
  // 多精灵课程保留精灵/舞台面板，单精灵课程会隐藏它
  spritePanelVisible: /Stage|舞台/.test(document.body.innerText)
})
```

## 注意事项与坑

- **课程之间要干净地重新开始。** 从一门课直接跳到另一门课，可能会让上一门课的会话仍然活着
  （它的视频对话框还赖着不走，它的会话还在响应页面跳转）。要单独测一门课，先清状态再重新加载课程 URL：
  ```js
  Object.keys(sessionStorage)
    .filter((k) => /copilot|tutorial/i.test(k))
    .forEach((k) => sessionStorage.removeItem(k))
  ```
- **推理泄漏在这里看得见。** 如果某条回复里出现了「让我看看当前状态……」这类**没有**被 `<thinking>`
  包裹的大白话，那就是泄漏的推理内容——这是真缺陷，哪怕末尾的 `<stay-silent />` 让用户那一轮看不见它。
- 想检查发**给**模型的确切请求（而不是回复），用
  [llm-payload.md](./llm-payload.md#如何在运行时查看真实-payload) 里的 `fetch` 钩子。

## 不经过 UI 验证课程**代码**（`/devtools/course-runner`）

要回答「这个参考答案真的能通关吗？」，根本不需要编辑器。仅在开发环境存在的页面
`/devtools/course-runner` 挂载了生产同款的 `ProjectRunner`（和用户跑的是同一个 WASM 引擎），
并暴露出 `window.courseRunner`：

```js
// 1. 加载课程的（公开）项目：
await courseRunner.load('curator', 'Coding-Course-1')
// -> { codeFiles: ['main', 'Kiko', 'Radish', ...] }

// 也可以直接加载本地 .xbp（上传之前就能验证）：
await courseRunner.loadXbp('/_verify/Lita-Course-02.xbp')

// 2. 覆盖代码并运行。键 = 精灵名，`main` 表示舞台：
const result = await courseRunner.run({ code: { Kiko: 'step 160' } })
// -> { exited, exitCode, durationMs, logs }

// 3. 对结构化的游戏日志做断言：
result.logs.filter((l) => l.level != null).map((l) => l.msg)
// -> ['捡到萝卜 Radish']
```

- `run()` 在游戏退出时 resolve，或者在 `timeoutMs`（默认 20 秒）之后。带事件处理器（onKey 之类）的游戏
  永远不会自己退出——**超时不等于失败**，要对 `logs` 做断言。
- **⚠️ 一个页面会话里只有第一次 `run()` 可信。** 每次运行都会起一个引擎实例，跑过几次之后，
  后续的运行会**静默失效**——明明正确的代码也会报告「没捡到萝卜」。这个坑曾经让人得出
  「`repeat` 和 `var` 在 spx 里不能用」的错误结论，并且撑过了好几轮排查。
  要批量验证多个关卡，就得**在关卡之间重新加载页面**：用 `?autorun=<同源脚本地址>`，
  让页面自己在加载完成后启动驱动脚本，脚本把进度存进 `sessionStorage`，跑完一关就 `location.reload()`。
- `level != null` 的日志条目是结构化游戏日志（`println` 输出、运行时错误）；
  `level == null` 的是引擎噪音，忽略即可。
- 这个页面访问公开项目不需要登录，而且**不会保存任何东西**。

## 教训

这套工具本身也曾经骗过人。上面那条「只有第一次运行可信」是花了好几轮排查才弄明白的，
在此之前，它稳定地给出了自相矛盾的结果（同样的代码、同样的项目，两遍跑出相反的结论）。

> **一个自身可靠性未经验证的验证工具，没有资格给任何问题下结论。**

如果验证结果开始自相矛盾，先怀疑工具，再怀疑被测对象。
