# What this branch adds

The tutorial rebuild turns a course from *a script the copilot reads out* into *a playground the
copilot watches over*. This document maps the change surface: what exists now that did not before,
and why each piece is shaped the way it is.

For how to author a course, see [course authoring](./course-authoring.md). For everything sent to
the model, see [the LLM payload](./llm-payload.md). For verifying a course actually works, see
[verifying courses](./verifying-courses.md).

## The design in one paragraph

The copilot is **silent by default**. It perceives everything the user does through real editor
events, but says nothing until the user is stuck, has drifted, or asks. How much it may do is not
a matter of prompt etiquette — an **intervention level** decides which guidance tools are even
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

Prompt rules alone proved unreliable here. The working order is: **mechanism first** (unregister
the tool), **per-round reminder second**, **protocol prose last**.

## 2. Perception: real editor events, no polling

`editor/copilot/user-events.ts`

The copilot used to wake on a timer. It now wakes on what actually happened: run start/stop, game
exit (any code), **runtime output** (not just errors — the win condition is a log line, so waking
only on errors meant coding courses could never complete), debounced code changes, diagnostics, and
sprite/tab selection.

## 3. Silence that actually stays silent

`copilot/markdown-elements/StaySilent.ts`, `copilot/content-visibility.ts`, `CopilotUI.vue`

`<stay-silent />` hides the entire round, including any reasoning that leaked around it. The chat
shows **only typed rounds** — event rounds drive the copilot invisibly. Cancelled event rounds are
skipped too (continuing to edit aborts the in-flight round; that is not something to show).

> **Pitfall worth knowing:** several elements apply their effect on mount (`api-reference-filter`,
> `api-video`, `spotlight-hint`, success/abandon). *Not rendering a round means the element never
> mounts and its effect never fires, silently.* Hidden rounds therefore use `v-show`, never `v-if`.
> This cost a real debugging session; an A/B run proved it (`apiItemCount: 128` vs `1`).

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

`workspace-layout.ts` is the editor-owned extension point behind it: focused layout, hideable
areas, and optional tools. Features drive the editor through it; **the editor never imports
tutorial code**. `reset()` on course exit means nothing outlives the course.

## 5. The ruler

`editor/preview/stage-viewer/StageRuler.vue`, `ruler-math.ts`

A course-only stage tool: drag to measure, endpoints snap to sprite centres. When a measurement
starts on a sprite it also reads the **turn angle** — signed, so the number is exactly what `turn`
expects (right positive, left negative, matching `Left = -90` / `Right = 90`).

This is what makes "how far?" and "which way?" answerable by the learner instead of guessable.
Courses 3, 8 and 9 are built on it.

## 6. Copilot presentation

`CopilotUI.vue`, `copilot.ts`

Docked panel with scrollable history and auto-growing height; no "Next step" button; the user's own
messages are shown. Courses start **background-first**: `Topic.autoOpenOnEvents = false` means
ambient events (navigation, modals) never pop the panel — including the navigation event fired on
reload, which used to make the panel reappear mid-course. A course whose subject *is* the copilot
opts out with `"copilot": "open"`.

Tutorial topics set `hideCodeInChat`, so code-bearing elements still drive their in-editor guides
but render the code unselectable in chat — visible, not copyable.

## 7. Opening sequence

`TutorialStoryVideoModal.vue`, `TutorialPreludeModal.vue`, `ApiVideo.vue`, `api-videos.ts`

Story video (series world-building) → knowledge-point video (only genuinely new APIs) → one-line
prelude → editor. API videos are keyed by definition id and remembered per user, so a concept is
never explained twice. API-reference hover cards play the same video.

## 8. Dev harness for course verification

`apps/xbuilder/pages/devtools/course-runner.vue` (dev-only route)

Drives the **real** runtime programmatically — same WASM engine the user runs:

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // or .load(owner, name) from cloud
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

**A hard-won constraint is baked into its design:** each run spins up an engine, and after a handful
of them in one page session, later runs silently do nothing — reporting *no-collect* for code that is
actually correct. Only the first run of a page session is trustworthy. `?autorun=<same-origin script>`
exists so a batch driver can reload the page between levels and resume.

That property caused a wrong conclusion mid-development ("`repeat` and `var` don't work in spx") that
survived several rounds before being disproved. **A verification tool whose own reliability is
unverified cannot settle a question.**

## Smaller things

- API-reference category sidebar hides when a filter narrows the list to a proper subset
- Course restart action, and "learn next course" now goes through the opening sequence
- Guidance level shown in the navbar course menu (`引导：关/低/高`)
- Per-round reminder context provider (`criticalContext`) that survives context truncation
- Editor leave-confirm and reload extension points

## Test coverage

Unit tests accompany the mechanisms whose behaviour is easy to regress: intervention levels and
verdict counting, guidance registration per level, course config parsing, content visibility,
ruler angle math, workspace layout reset, code guides, and the prelude/course-start flow.
