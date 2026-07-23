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
  "videos": ["step"]                              // knowledge-point videos played at start
}
```

### `apis` / `videos` entries

Each entry matches a panel item (and all of its overloads) as a bare name (`step`), a dotted name (`Sprite.step`), or a definition ID (`xgo:...?Sprite.step#0`; without `#overload` it matches all overloads). Language constructs use their canonical names: `if_statement`, `if_else_statement`, `var_declaration`, `for_iterate`. spx functions and project-defined methods (e.g. `IsMature`, `Water`) work as bare names.

`videos` uses the same names. Videos come from the global knowledge-point library (keyed by definition ID); in demo mode unknown entries play the shared demo video. Watched knowledge points are remembered and not pushed again.

### Choosing the completion judge

* **`judge: "code"` (preferred)** — when completion is observable from the game's runtime output. The frontend decides and the success dialog opens instantly; the Copilot then receives a "Course completed" event and fills in a one-sentence comment. Two signals:
  * **`complete.log` + `count`**: for collect-N goals — completion is `count` DISTINCT output lines containing `log`, within a single run (re-running resets the count).
  * **The sentinel (default)**: the project prints `@@builder:course-complete@@` from its own goal logic.
* **`judge: "copilot"`** — only when completion cannot be judged from output (e.g. "message the Copilot", or "must have used `repeat`" when the starting code already wins). State the criteria in the prose; the Copilot declares success (this mode inherently costs one LLM round).

### The fast path

Declaring `apis` or `videos` switches the Copilot's opening protocol to purely silent (verdict + stay-silent, no tool calls) — the frontend owns all course-start setup. Courses declaring neither keep the legacy Copilot-driven setup. New courses should always declare.

## Three kinds of video, don't confuse them

* **Opening story video** — the series intro (world & goal), usually only on the first course. Authored as `<course-story-video>URL</course-story-video>` in the prompt (put it after the jsonc block, before `<course-prelude>`); it plays before the editor loads, ahead of the prelude. Orthogonal to `judge` / `apis` / `videos`.
* **Knowledge-point videos** (config `videos`) — an API's explainer, played in a dialog right after the editor loads.
* **Hover-card video** — the same API explainer, always available on hover during the course; no config.

Story-video sources are **origin-restricted** (the `?video=` query param is spoofable): allowed origins are same-origin, `usercontentBaseUrl`, and the tutorial video host (`tutorialVideoAssetBaseUrl` in `api-videos.ts`, an S3 bucket during the demo phase). A URL on any other origin is silently dropped. Because the site is cross-origin isolated (COEP), cross-origin videos need `<video crossorigin>` plus the bucket's CORS (all three video surfaces already set it).

## The prose (the Copilot's lesson plan)

Recommended sections (see the Code: Lita series): `<course-prelude>`, `## 目标`, `## 当前代码` (with a reference answer marked as one-of-many), `## 完成判定`, optional `## 引导要点`. Do not write "narrow the APIs at start" / "play the video at start" prose — the config already does that, and such prose conflicts with the silent opening protocol. For `judge: "code"` courses, state explicitly that the system judges and the Copilot must not declare completion. Prompt limit: 4000 characters.

## Workflow for a new course

1. Build the course project; make the game print a judgeable output line per key progress step (or print the sentinel when the goal is reached).
2. Pick the judge: output-observable → `judge: "code"` + `complete`; otherwise → `judge: "copilot"` + written criteria.
3. Write the config block: `hide` / `apis` (the union across the whole course) / `videos` (this course's new knowledge points only).
4. Write the prose sections.
5. Add to the series and export the `.xbcs.zip` archive.

## State of the Code: Lita series (after the 2026-07 restructuring)

Series 32 "Code: Lita", 28 courses (IDs 211–238, projects `curator/Lita-Course-01`…`-28`), fully structured: 25 courses are `judge: "code"` with `complete: { "log": "捡到萝卜", "count": N }` (N = that course's carrot count — instant success dialog); 3 are `judge: "copilot"` because output cannot judge them (course 1: message the Copilot; course 13: `turnTo` must appear; course 19: starting code already wins, `repeat` must be adopted). 27 courses declare `apis`, 12 declare `videos`. The former "knowledge-point videos" / "APIs of this course" prose sections were removed (moved into config) and the completion sections were rewritten per judge mode; all other lesson-plan prose is preserved verbatim.
