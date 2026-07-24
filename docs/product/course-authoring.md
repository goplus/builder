# Course Authoring

This is the operating manual for course authors: what a course consists of, how to write the structured config, and the workflow for building a course from scratch. For the product concepts behind tutorials (Copilot, sessions, the intervention ladder), see [User Tutorial](./tutorial.md).

## What a course consists of

A course has a **title**, a **thumbnail**, an **entrypoint** (the editor URL of the course project, which carries the stage setup and the starting code; in-course editing is effect-free and restarting restores it), and a **prompt** — a structured text with two readers: the leading ` ```jsonc ` **config block** is read by the frontend and applied the moment the course starts, while the remaining prose is the Copilot's lesson plan.

Courses are organized into series. A series can be exported to / imported from an `.xbcs.zip` archive (`course-series.json`, the course projects as `.xbp`, thumbnails).

## The jsonc config block

The first ` ```jsonc ` block in the prompt is parsed as the course config and applied instantly at course start — no Copilot round, no delay. All fields are optional; a malformed block falls back to an empty config.

```jsonc
{
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  "copilot": "open",                              // start with the panel open (default: hidden)
  "judge": "code",                                // "code" (default) or "copilot"
  "complete": { "log": "捡到萝卜", "count": 4 },   // judge:"code" signal, see below
  "apis": ["step", "turn"],                       // narrow the API References panel
  "opening": [                                    // the in-editor opening sequence, see below
    { "prelude": "The code is ready. Find the Run button and run it." },
    { "video": "step" },
    { "spotlight": { "ui": "Run button" }, "tip": "Click to run" }
  ]
}
```

### The `opening` sequence

`opening` is an **ordered array** played step by step once the editor is up. It is the single source of ordering for the in-editor opening: a course declaring it has its prelude, knowledge-point videos, and spotlights all arranged by it, superseding the `videos` field and the legacy `<course-prelude>` modal. Each entry is one of three steps:

| Step | Shape | Behavior |
|---|---|---|
| Prelude | `{ "prelude": "one-line guide" }` | Shows a text guide modal; the user clicks to continue |
| Video | `{ "video": "step" }` | Plays the API's explainer (skipped if already learned); entry format same as `apis` |
| Spotlight | `{ "spotlight": { "api": "step" }, "tip": "Drag it in" }` | Highlights a UI element, dims the rest, shows `tip` (optional); continues on the next click |

A spotlight target is either `{ "api": "step" }` — an API item in the panel, addressed like an `apis` entry — or `{ "ui": "Run button" }` — a UI landmark addressed by its **Radar name**. Common landmarks: `Run button`, `Ruler`, `API References`, `Copilot trigger` (more are the `name` in `v-radar={{ name: ... }}` in the source). If a target never appears, the spotlight retries a few times and then skips, so it can't stall the sequence.

Ordering is the experience: the typical arrangement is prelude → knowledge-point video → spotlight the control to act on. An empty (absent) `opening` falls back to the legacy behavior: `videos` play at start and `<course-prelude>` shows before the editor.

### `apis` / video / spotlight entries

`apis`, `opening` `video` steps, and `spotlight` `api` targets share one API-name matcher. Each entry matches a panel item (and all of its overloads) as a bare name (`step`), a dotted name (`Sprite.step`), or a definition ID (`xgo:...?Sprite.step#0`; without `#overload` it matches all overloads). Language constructs use their canonical names: `if_statement`, `if_else_statement`, `var_declaration`, `for_iterate`. spx functions and project-defined methods (e.g. `IsMature`, `Water`) work as bare names.

Videos come from the global knowledge-point library (keyed by definition ID); **every overload of an API resolves to the same video** (the video explains the API, not one overload), and a bare name works too. In demo mode unknown entries play the shared demo video. Watched knowledge points are remembered and not pushed again.

**Non-API topic videos**: editor tools can have an explainer too. Currently the **ruler** (ID `xbuilder:?ruler`, or just `ruler`). It has no entry in the API reference panel, so the copilot learns the ID from the `<api-video>` element's description and plays it when the user asks how the ruler works. To play it at course start instead, put it in `opening` as usual: `{ "video": "ruler" }`.

### Choosing the completion judge

* **`judge: "code"` (preferred)** — when completion is observable from the game's runtime output. The frontend decides and the success dialog opens instantly; the Copilot then receives a "Course completed" event and fills in a one-sentence comment. Two signals:
  * **`complete.log` + `count`**: for collect-N goals — completion is `count` DISTINCT output lines containing `log`, within a single run (re-running resets the count).
  * **The sentinel (default)**: the project prints `@@builder:course-complete@@` from its own goal logic.
* **`judge: "copilot"`** — only when completion cannot be judged from output (e.g. "message the Copilot", or "must have used `repeat`" when the starting code already wins). State the criteria in the prose; the Copilot declares success (this mode inherently costs one LLM round).

### The fast path

Declaring `apis` or `opening` (or the legacy `videos`) switches the Copilot's opening protocol to purely silent (verdict + stay-silent, no tool calls) — the frontend owns all course-start setup. Courses declaring none keep the legacy Copilot-driven setup. New courses should always declare.

## Three kinds of video, don't confuse them

* **Opening story video** — the series intro (world & goal), usually only on the first course. It is the one opening piece still authored as a tag rather than an `opening` entry, because it plays *before* the editor exists (before the course even starts) and carries its own source check. Authored as `<course-story-video>URL</course-story-video>` in the prompt (put it after the jsonc block). Orthogonal to `judge` / `apis` / `opening`.
* **Knowledge-point videos** (the `opening` `video` steps) — an API's explainer, played in a dialog in `opening` order after the editor loads.
* **Hover-card video** — the same API explainer, always available on hover during the course; no config.

Story-video sources are **origin-restricted** (the `?video=` query param is spoofable): allowed origins are same-origin, `usercontentBaseUrl`, and the tutorial video host (`tutorialVideoAssetBaseUrl` in `api-videos.ts`, an S3 bucket during the demo phase). A URL on any other origin is silently dropped. Because the site is cross-origin isolated (COEP), cross-origin videos need `<video crossorigin>` plus the bucket's CORS (all three video surfaces already set it).

## The prose (the Copilot's lesson plan)

The opening guide line now lives in the config's `opening.prelude`, not a `<course-prelude>` tag. Recommended prose sections (see the Code: Lita series): `## 目标`, `## 当前代码` (with a reference answer marked as one-of-many), `## 完成判定`, optional `## 引导要点`. Do not write "narrow the APIs at start" / "play the video at start" / "spotlight the button first" prose — the config's `apis` / `opening` already do that, and such prose conflicts with the silent opening protocol. For `judge: "code"` courses, state explicitly that the system judges and the Copilot must not declare completion. Prompt limit: 4000 characters.

## Workflow for a new course

1. Build the course project; make the game print a judgeable output line per key progress step (or print the sentinel when the goal is reached).
2. Pick the judge: output-observable → `judge: "code"` + `complete`; otherwise → `judge: "copilot"` + written criteria.
3. Write the config block: `hide` / `apis` (the union across the whole course) / `opening` (the prelude line + this course's new knowledge-point videos + the spotlight for the control to act on, in order).
4. Write the prose sections.
5. Add to the series and export the `.xbcs.zip` archive.

## State of the Code: Lita series (after the 2026-07 restructuring)

Series 32 "Code: Lita", 28 courses (IDs 211–238, projects `curator/Lita-Course-01`…`-28`), fully structured: 25 courses are `judge: "code"` with `complete: { "log": "捡到萝卜", "count": N }` (N = that course's carrot count — instant success dialog); 3 are `judge: "copilot"` because output cannot judge them (course 1: message the Copilot; course 13: `turnTo` must appear; course 19: starting code already wins, `repeat` must be adopted). 27 courses declare `apis`. All 28 have an `opening` sequence: a one-line `prelude` each (inlined from the old `<course-prelude>`); 12 include a knowledge-point video step; 4 include an opening spotlight — course 2 (first run) highlights the Run button, courses 3 and 8 highlight the Ruler, course 4 highlights the API References panel. Course 1 keeps its `<course-story-video>` (the series intro `opening.webm`). The former "knowledge-point videos" / "APIs of this course" prose sections were removed (moved into config), `<course-prelude>` was inlined into `opening`, and the completion sections were rewritten per judge mode; all other lesson-plan prose is preserved verbatim.
