# What this branch adds

This tutorial rebuild turns a course from **a textbook the copilot reads out** into **a Playground
the copilot watches over**.

## Design

## 1. Intervention levels

`tutorial-intervention.ts`, `tutorial-guidance.ts`, `user-progress.ts`

Three levels: **Silent(1) → Nudge(2) → Guide(3)**. Each level registers a different set of custom
elements; unavailable tools are **unregistered**, which sidesteps the problem of a model having to
judge, on its own, what state a long-running session is currently in.

| Level | What exists |
|---|---|
| Silent | `api-video` only |
| Nudge | `+ guide-modal`, `spotlight-hint` |
| Guide | `+ all in-editor code guides: code-change-hint, code-type-hint, code-drag-hint, ...` |

The level moves on **progress verdicts**: every event round, the model reports
`<user-progress-ahead/>` / `<user-progress-neutral/>` / `<user-progress-back/>`. The system counts
them (`neutralThreshold = 6`, `backThreshold = 3`); an *ahead* spends the counters down, and an
*ahead* while the counters are already at 0 de-escalates. A typed user message temporarily raises
the level to at least Nudge.

Prompt rules alone proved unreliable. What we use is the combination:
**mechanism first**, **then a per-round reminder**, **then the protocol prose**.

## 2. Perception: more events

`editor/copilot/user-events.ts`

The copilot now perceives many more events: run start/stop, game exit (any exit code), **runtime
output**, debounced code changes, diagnostics, and sprite/tab selection.

That "runtime output" entry is load-bearing: the signal for passing a level *is* a log line, so
waking only on errors meant a coding course **could never complete unless the user clicked Next
step**.

The design principle here is: **perceive more actively, intervene more passively**. And we removed
the Next step button.

## 3. Less intervention

`copilot/markdown-elements/StaySilent.ts`, `copilot/content-visibility.ts`, `CopilotUI.vue`

`<stay-silent />` hides the **entire round**, including any reasoning that leaked around it. The chat
shows **only rounds the user typed** — event-driven rounds run invisibly in the background. Cancelled
event rounds are skipped too (continuing to edit aborts the in-flight round; that is not something to
show).

## 4. Course-authored workspace setup

`tutorials/course-config.ts`, `editor/workspace-layout.ts`

A course declares its own workspace (i.e. how to simplify the UI) in a ```jsonc block in the prompt:

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  "copilot": "open"
}
```

## 5. The ruler

`editor/preview/stage-viewer/StageRuler.vue`, `ruler-math.ts`

A course-only stage tool: drag to measure, endpoints snap to sprite centres. When a measurement
**starts on a sprite**, it also reads the **turn angle** — signed, so the number is exactly what
`turn` expects (right positive, left negative, matching `Left = -90` / `Right = 90`).

This is what makes "how far?" and "which way?" **measurable** rather than guessable. Courses 3, 8
and 9 are built on it.

## 6. Copilot presentation

`CopilotUI.vue`, `copilot.ts`

A docked panel with scrollable history and auto-growing height; the "Next step" button is gone; the
user's own messages are shown. Courses start **background-first**: `Topic.autoOpenOnEvents = false`
means ambient events (navigation, modals) never pop the panel — **including the navigation event
fired on page reload**, which used to make the panel reappear mid-course. A course whose subject *is*
the copilot opts out with `"copilot": "open"`.

Tutorial topics set `hideCodeInChat`, so code-bearing elements still drive their in-editor guides but
render the code unselectable in chat — **visible, not copyable**.

## 7. Opening sequence

`TutorialStoryVideoModal.vue`, `TutorialPreludeModal.vue`, `ApiVideo.vue`, `api-videos.ts`

Story video (series world-building) → knowledge-point video (only genuinely new APIs) → a one-line
prelude → the editor. API videos are keyed by definition id and remembered per user, so **a concept
is never explained twice**. API-reference hover cards play the same video.

## 8. Dev harness for course verification (so an Agent can debug a course during local development)

`apps/xbuilder/pages/devtools/course-runner.vue` (dev-only route)

Drives the **real** runtime programmatically — the same WASM engine users run:

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // or .load(owner, name) from cloud
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

## Smaller things

- The API-reference category sidebar hides when a filter narrows the list to a proper subset
- A course-restart action, and "learn next course" now goes through the full opening sequence
- The guidance level is shown in the navbar course menu (`引导：关/低/高`)
- A per-round reminder context provider (`criticalContext`) that survives context truncation
- Editor leave-confirm and reload extension points
