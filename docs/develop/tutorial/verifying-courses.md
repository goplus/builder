# Verifying a tutorial course at runtime

A fast way to check whether a course behaves correctly — without clicking through
every dialog, and seeing even the **invisible** things the copilot emits
(`api-reference-filter`, `user-progress-*`, `stay-silent`), which never show on screen.

The trick: the whole copilot session is persisted to `sessionStorage` (throttled, ~300ms), so
you can read exactly what the copilot replied on every round straight from storage.

## Dump the copilot session

Paste into the browser console (during or after a course):

```js
function dumpCopilotSession() {
  const raw = sessionStorage.getItem('spx-gui-copilot-session')
  if (raw == null) return '(no copilot session)'
  const parsed = JSON.parse(raw)
  // The value is user-scoped: { __user__, __value__: <session> }.
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

Each round shows its `trigger` (the event name or the text the user typed), the round `state`
(`completed` / `loading` / `cancelled` / `failed`), and the copilot's raw `reply` — tags and all.

## What a healthy course opening looks like

The first round should be `event: Course Started`, `state: completed`, and its reply should be
ONLY invisible setup elements — no greeting, no course name, no narration. For a coding course:

```
<api-reference-filter ids="..." />       ← narrows the API panel to the course's APIs
<api-video api="..." />                   ← one per declared knowledge point (opening video)
<user-progress-neutral />                 ← the first progress verdict
```

Check against the course prompt: the `ids` should match the course's API list, and the
`api-video`s should match the declared knowledge points. A non-coding course may have just
`<user-progress-neutral />` (+ `<stay-silent />`).

## DOM quick-checks (inside the editor)

```js
({
  // The category sidebar is hidden while a filter is active (see feat: hide category sidebar).
  categorySidebarHidden: document.querySelector('section[class*="min-h-0"] > ul.flex-none') == null,
  apiItemCount: document.querySelectorAll('.api-reference-item').length,
  editorLoadFailed: document.body.innerText.includes('Failed to load'),
  // Multi-sprite courses keep the sprite/stage panel; single-sprite ones hide it.
  spritePanelVisible: /Stage|舞台/.test(document.body.innerText)
})
```

## Notes & gotchas

- **Clean start between courses.** Navigating from one course straight to another can leave the
  previous session active (its video dialog lingers, its session reacts to the navigation). To
  test a course in isolation, clear the state first, then reload the course URL:
  ```js
  Object.keys(sessionStorage)
    .filter((k) => /copilot|tutorial/i.test(k))
    .forEach((k) => sessionStorage.removeItem(k))
  ```
- **Reasoning leaks are visible here.** If a reply contains plain prose like "Let me check the
  current state..." that is NOT wrapped in `<thinking>`, that is leaked reasoning — a real defect,
  even if a trailing `<stay-silent />` hides it from the user that round.
- To inspect the exact request sent TO the model (not the reply), use the `fetch` hook in
  [llm-payload.md](./llm-payload.md#如何在运行时查看真实-payload).
```
