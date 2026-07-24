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

## 4. Course-authored configuration

`tutorials/course-config.ts`, `editor/workspace-layout.ts`, `tutorials/TutorialRoot.vue`

A course declares its configuration in a ```jsonc block at the top of the prompt. The **frontend
reads and applies it the moment the course starts** — no copilot round, no delay:

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"], // simplify UI
  "copilot": "open",                              // open the panel at start (default: hidden, background)
  "judge": "code",                                // completion: code (default, from output) / copilot
  "complete": { "log": "捡到萝卜", "count": 4 },   // the code-judged completion signal (see below)
  "apis": ["step", "turn"],                       // narrow the API panel at start (union over the course)
  "opening": [                                    // ordered in-editor opening (see §7)
    { "prelude": "..." }, { "video": "step" }, { "spotlight": { "ui": "Run button" }, "tip": "..." }
  ]
}
```

This setup used to be done by the copilot in its opening reply — a tool round plus a generation, so
the panel narrowed seconds late and videos landed over whatever the user was doing. It is now
**static data applied at t=0**; a course declaring `apis` / `opening` (or the legacy `videos`) flips
the copilot's opening protocol to **purely silent** (verdict + `<stay-silent/>`, zero tool calls).
API entries may be a bare name (`step`), a dotted name (`Sprite.step`), or a full definition id;
language constructs use their canonical names (`if_statement`, `for_iterate`, ...).

**Completion (`judge` + `complete`):**
- `code` (preferred): completion is observable from runtime output. The frontend decides and the
  success dialog opens **instantly** (no LLM wait); the copilot then gets a "Course completed" event
  and fills in a comment. The signal is `complete: { log, count }` — `count` DISTINCT output lines
  containing `log` within a single run (for collect-N goals whose project logs each step); absent, it
  falls back to the sentinel `@@builder:course-complete@@` the project prints itself.

  The evaluation comment is told exactly where it lands (the dialog's comment area — prose in a
  hidden event round reaches nowhere else), and it is protected from event supersession twice over:
  ambient events (editor perception, page/modal noise — including the "Modal opened" the success
  dialog itself fires) are **dropped while a copilot-produced artifact is on screen**, so nothing
  aborts the round writing the comment; and should a round still be superseded, the dialog accepts
  the evaluation from whichever event round ends up carrying it, instead of timing out into the
  fallback text.
- `copilot`: when output cannot judge it (e.g. "message the copilot", or "must have used `repeat`"),
  the copilot declares completion, at the cost of one LLM round.

Author's guide: `docs/product/course-authoring.md`.

## 5. The ruler

`editor/preview/stage-viewer/StageRuler.vue`, `ruler-math.ts`

A course-only stage tool: drag to measure, endpoints snap to sprite centres. When a measurement
**starts on a sprite**, it also reads the **turn angle** — signed, so the number is exactly what
`turn` expects (right positive, left negative, matching `Left = -90` / `Right = 90`).

This is what makes "how far?" and "which way?" **measurable** rather than guessable. Courses 3, 8
and 9 are built on it.

## 6. Copilot presentation

`CopilotUI.vue`, `CopilotChat.vue`, `editor/copilot/EditorCopilot.vue`, `copilot.ts`

The copilot's **state is a global singleton** (provided by `CopilotRoot`), but the **presentation is
a shared chat body plus two shells**:
- `CopilotChat.vue` — the shared conversation body (rounds, quick inputs, welcome screen, input,
  drag handle);
- `CopilotUI.vue` — the global floating shell (home / community / normal editor), draggable to an
  edge;
- `editor/copilot/EditorCopilot.vue` — the **editor-owned** docked shell for the focused tutorial
  layout, living in the control row at the code column's bottom-right, its panel anchored above the
  trigger by plain layout — no more measuring viewport coordinates into a global overlay.

Both shells inject the same copilot instance, so the conversation **carries seamlessly** from
floating to docked. The Run/Stop control teleports into that same row (the runner logic stays in the
preview component). The docked panel has scrollable history and a drag-resizable height; while
generating, the C mark in the trigger spins — **even when the panel is hidden**.

Courses start **background-first**: `Topic.autoOpenOnEvents = false` means ambient events
(navigation, modals) never pop the panel — **including the navigation event fired on page reload**,
which used to make the panel reappear mid-course. A course whose subject *is* the copilot opts out
with `"copilot": "open"`.

Tutorial topics set `hideCodeInChat`, so code-bearing elements still drive their in-editor guides but
render the code unselectable in chat — **visible, not copyable**.

## 7. Opening sequence

`course-start.vue`, `TutorialStoryVideoModal.vue`, `TutorialPreludeModal.vue`, `ApiVideoModal.vue`,
`api-videos.ts`, `course-config.ts`, `TutorialRoot.vue`, `utils/spotlight/*`, `utils/radar`

The story video (series world-building) still plays **before** the editor exists; everything after
it is one **ordered, author-declared `opening` sequence** applied by the frontend once the editor is
up (see §4) — prelude / knowledge-point video / spotlight steps, played strictly in the authored
order, one cursor advancing on continue / close / dismiss. This replaces the old fixed "video →
prelude" ordering and the pre-editor `<course-prelude>` modal (which is now inlined into `opening`;
the story video stays a tag because it precedes the editor and carries its own origin check).

A **spotlight** step highlights the one thing to act on next — a UI landmark by its Radar name
(`Radar.getNodeByName`, e.g. `"Run button"`, `"Ruler"`) or an API-references item by its definition
id (a new `data-def-id` on the item, matched with the same `createCourseApiMatcher` as `apis`) — and
advances when the user clicks (a new `concealed` event on `Spotlight`). Targets that mount late are
retried, then skipped, so a bad reference can't stall the opening.

API videos are keyed by definition id and remembered per user, so **a concept is never explained
twice**; every overload of an API resolves to the same video, and non-API topics can have one too
(the ruler, which the copilot plays when asked how measuring works — it learns the id from the
`<api-video>` description, the only place it appears). API-reference hover cards play the same video
(the dialog is the shared `ApiVideoModal`).

Video dialogs **size themselves to the video**: the library is not one shape (the newer explainers
are 4:3, the older ones 16:9) and story videos vary per series, so the box reads the intrinsic ratio
from the loaded metadata rather than pinning one and letterboxing everything else. Nothing to
declare per video.

Externally hosted videos (e.g. S3) load in CORS mode via `<video crossorigin>` to pass the site's
COEP; story videos are origin-allowlisted (same-origin + usercontent CDN + the tutorial asset host),
which `<course-story-video>` may point at.

## 8. Dev harness for course verification (so an Agent can debug a course during local development)

`apps/xbuilder/pages/devtools/course-runner.vue` (dev-only route)

Drives the **real** runtime programmatically — the same WASM engine users run:

```js
await courseRunner.loadXbp('/path/to/course.xbp')   // or .load(owner, name) from cloud
const r = await courseRunner.run({ code: { Lita: 'step 160' }, timeoutMs: 15000 })
// r.logs -> [{ level: 'INFO', msg: '捡到萝卜 Radish', ... }]
```

## The focused editor (aligned to the design)

`EditorPreview.vue`, `stage-viewer/StageViewer.vue`, `ui/icons/ruler.svg`, `api-reference/*`,
`input-helper/*`

- **API reference cards** hug their signature; the **panel width follows the widest card**
  (`max-content`, clamped) and is **drag-resizable** at its right edge — dragging takes over from
  the auto fit, double-clicking the handle restores it. Beyond the clamp the list scrolls
  horizontally. When a filter narrows the list, the category headers and separators hide along
  with the category sidebar — a handful of hand-picked items needs no scaffolding.
- **The ruler button** is a white card that turns turquoise on hover / while measuring (`#eaf9fa`
  face + `#36c2cf` glyph), with a new tilted-ruler icon; its tooltip is hover-only. **While the
  game runs it stays in place as an unusable variant** (grey glyph under a red slash) instead of
  vanishing — a working runtime ruler would need the engine to expose live sprite transforms.
- **The running game sits exactly on the edit stage**: the runner is constrained to the largest
  viewport-aspect rect inscribed in the (non-4:3) focused container — the same letterbox the edit
  stage uses — so entering/leaving a run no longer shifts the world.
- **Run/Stop** is a white card framing a solid pill (teal Run `#36c2cf` / red Stop `#ef4149`), one
  button that toggles.
- **The input helper is gated by type in block style**: plain literals (integer / decimal / string /
  boolean) show neither the pencil nor the hover "Modify"; the pickers (direction, color, key,
  effect, resource, ...) keep both (`isInputHelperHidden`, fed the hidden-type set by
  `SpriteEditor` / `StageEditor` in focused mode).

## Smaller things

- The API-reference category sidebar hides when a filter narrows the list to a proper subset
- A course-restart action, and "learn next course" now goes through the full opening sequence
- The navbar tutorial entry is a pill (a turquoise capsule around the icon; the button greys while
  the control center is open); the guidance level shows in the navbar course menu (`引导：关/低/高`)
- The control center's "return" goes back to the **series** page (`/course-series/:id`), not the
  tutorials index
- A modal now covers the copilot and run controls (their z-index sits in the normal range, below
  modals)
- A per-round reminder context provider (`criticalContext`) that survives context truncation
- Editor leave-confirm and reload extension points
