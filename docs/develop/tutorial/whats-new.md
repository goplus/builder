# What this branch adds

This tutorial rebuild turns a course from **a script the copilot reads out** into **a playground the
copilot watches over**. This document maps the change surface: what exists now that did not before,
and why each piece is shaped the way it is.

For how to author a course, see [course authoring](./course-authoring.md). For everything sent to
the model, see [the LLM payload](./llm-payload.md). For verifying a course actually works, see
[verifying courses](./verifying-courses.md). Those three are written in Chinese, for the people who
write courses; a Chinese version of this document is at [whats-new.zh.md](./whats-new.zh.md).

## The design in one paragraph

The copilot is **silent by default**. It perceives everything the user does through real editor
events, but says nothing until the user is stuck, has drifted, or asks. How much it may do is not a
matter of prompt etiquette — an **intervention level** decides which guidance tools are even
*registered*, so a tool the copilot must not use at this level does not exist for it. The level
itself is driven by the model's own per-round verdict on whether the user is getting closer.

## 1. Intervention levels — a hard boundary, not a suggestion

`tutorial-intervention.ts`, `tutorial-guidance.ts`, `user-progress.ts`

Three levels: **Silent(1) → Nudge(2) → Guide(3)**. Each level registers a different set of custom
elements; unavailable tools are *unregistered*, so the copilot cannot reach for them.

| Level | What exists |
|---|---|
| Silent | `api-video` only |
| Nudge | `+ guide-modal`, `spotlight-hint` |
| Guide | `+ in-editor code guides` |

The level moves on **progress verdicts**: every event round, the model reports
`<user-progress-ahead/>` / `<user-progress-neutral/>` / `<user-progress-back/>`. The system counts
them (`neutralThreshold = 6`, `backThreshold = 3`); an *ahead* spends counters down and, when there
is nothing to forgive, de-escalates. A typed user message temporarily raises the level to at least
Nudge — someone who asks deserves an answer.

Prompt rules alone proved unreliable here. The working order is: **mechanism first** (unregister the
tool), **per-round reminder second**, **protocol prose last**.

## 2. Perception: real editor events, no polling

`editor/copilot/user-events.ts`

The copilot used to wake on a timer. It now wakes on what actually happened: run start/stop, game
exit (any code), **runtime output**, debounced code changes, diagnostics, and sprite/tab selection.

That "runtime output" entry is load-bearing: the signal for passing a level *is* a log line, so
waking only on errors meant coding courses could never complete.

## 3. Silence that actually stays silent

`copilot/markdown-elements/StaySilent.ts`, `copilot/content-visibility.ts`, `CopilotUI.vue`

`<stay-silent />` hides the entire round, including any reasoning that leaked around it. The chat
shows **only typed rounds** — event-driven rounds run invisibly. Cancelled event rounds are skipped
too (continuing to edit aborts the in-flight round; that is not something to show).

> **Pitfall worth knowing:** several elements apply their effect on mount (`api-reference-filter`,
> `api-video`, `spotlight-hint`, the success/abandon elements). **Not rendering a round means the
> element never mounts and its effect never fires, silently.** Hidden rounds therefore use `v-show`,
> never `v-if`. This cost a real debugging session and was settled by an A/B run
> (`apiItemCount: 128` vs `1`).

## 4. Course-authored workspace setup

`tutorials/course-config.ts`, `editor/workspace-layout.ts`

A course declares its own workspace in a ```jsonc block in the prompt — static author intent, not
something the copilot decides at runtime:

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  "copilot": "open"
}
```

Behind it is `workspace-layout.ts`, an **editor-owned extension point**: focused layout, hideable
areas, optional tools. Features drive the editor through it, and **the editor never imports tutorial
code**. `reset()` on course exit means no setting outlives the course.

## 5. The ruler

`editor/preview/stage-viewer/StageRuler.vue`, `ruler-math.ts`

A course-only stage tool: drag to measure, endpoints snap to sprite centres. When a measurement
**starts on a sprite**, it also reads the **turn angle** — signed, so the number is exactly what
`turn` expects (right positive, left negative, matching `Left = -90` / `Right = 90`).

This is what makes "how far?" and "which way?" **measurable** rather than guessable. Courses 3, 8
and 9 are built on it.

## 6. Copilot presentation

`CopilotUI.vue`, `copilot.ts`

A docked panel with scrollable history and auto-growing height; no "Next step" button; the user's own
messages are shown. Courses start **background-first**: `Topic.autoOpenOnEvents = false` means
ambient events (navigation, modals) never pop the panel — **including the navigation event fired on
page reload**, which used to make the panel reappear mid-course. A course whose subject *is* the
copilot opts out with `"copilot": "open"`.

Tutorial topics set `hideCodeInChat`, so code-bearing elements still drive their in-editor guides but
render the code unselectable in chat — **visible, not copyable**.

## 7. Opening sequence

`TutorialStoryVideoModal.vue`, `TutorialPreludeModal.vue`, `ApiVideo.vue`, `api-videos.ts`

Story video (series world-building) → knowledge-point video (only genuinely new APIs) → a one-line
prelude → the editor. API videos are keyed by definition id and remembered per user, so **a concept
is never explained twice**. API-reference hover cards play the same video.

## 8. Dev harness for course verification

`apps/xbuilder/pages/devtools/course-runner.vue` (dev-only route)

Drives the **real** runtime programmatically — the same WASM engine users run:

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // or .load(owner, name) from cloud
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

**A hard-won constraint is baked into its design:** each run spins up an engine instance, and after a
handful of them in one page session, later runs **silently do nothing** — reporting "not collected"
for code that is in fact correct. **Only the first run of a page session is trustworthy.**
`?autorun=<same-origin script>` exists so a batch driver can reload the page between levels and
resume.

That property caused a wrong conclusion mid-development ("`repeat` and `var` don't work in spx") that
survived several rounds of investigation before being disproved. **A verification tool whose own
reliability is unverified cannot settle a question.**

## Smaller things

- The API-reference category sidebar hides when a filter narrows the list to a proper subset
- A course-restart action, and "learn next course" now goes through the full opening sequence
- The guidance level is shown in the navbar course menu (`引导：关/低/高`)
- A per-round reminder context provider (`criticalContext`) that survives context truncation
- Editor leave-confirm and reload extension points

## Test coverage

Unit tests accompany the mechanisms that are easy to regress: intervention levels and verdict
counting, per-level guidance registration, course config parsing, content visibility, ruler angle
math, workspace layout reset, code guides, and the prelude/course-start flow.
