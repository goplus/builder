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
  "complete": {                                   // judge:"code" signal, see below
    "log": "捡到萝卜", "count": 4,                  // the primary goal
    "require": { "code": ["repeat"], "hint": "…" } // the secondary goal (optional)
  },
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

A spotlight target is `{ "api": "step" }` — an API item in the panel, addressed like an `apis` entry — or `{ "ui": "Run button" }` — a UI landmark addressed by its **Radar name** — or `{ "sprite": "Boat" }` — a sprite on the edit stage, addressed by its name (the stage anchors an overlay on it; clicking inside selects the sprite). Common UI landmarks: `Run button`, `Ruler`, `API References`, `Copilot trigger`, `Selected sprite name` (more are the `name` in `v-radar={{ name: ... }}` in the source). If a target never appears, the spotlight retries a few times and then skips, so it can't stall the sequence. A step whose target only appears **after the user acts on the previous step** opts out of the skip with `"patient": true` — e.g. teaching name insertion: spotlight the sprite (`{ "sprite": "Mushroom" }`), then spotlight `Selected sprite name` with `patient` (the label exists only once the sprite is selected; clicking it inserts the name at the code cursor).

Ordering is the experience: the typical arrangement is prelude → knowledge-point video → spotlight the control to act on. An empty (absent) `opening` falls back to the legacy behavior: `videos` play at start and `<course-prelude>` shows before the editor.

### `apis` / video / spotlight entries

`apis`, `opening` `video` steps, and `spotlight` `api` targets share one API-name matcher. Each entry matches a panel item (and all of its overloads) as a bare name (`step`) or a dotted name (`Sprite.step`); append `#N` to pin one overload (`step#0` — the basic form only). **Do not use full definition IDs** (`xgo:github.com/goplus/spx/v2?...`): they embed the engine module version and silently stop matching when the engine major-bumps — the spx v2→v3 upgrade broke a course exactly this way. Language constructs use their canonical names: `if_statement`, `if_else_statement`, `var_declaration`, `for_iterate`. spx functions and project-defined methods (e.g. `IsMature`, `Water`) work as bare names.

Videos come from the global knowledge-point library (keyed by definition ID); **every overload of an API resolves to the same video** (the video explains the API, not one overload), and a bare name works too. In demo mode unknown entries play the shared demo video. Watched knowledge points are remembered and not pushed again.

**Non-API topic videos**: editor tools can have an explainer too. Currently the **ruler** (ID `xbuilder:?ruler`, or just `ruler`). It has no entry in the API reference panel, so the copilot learns the ID from the `<api-video>` element's description and plays it when the user asks how the ruler works. To play it at course start instead, put it in `opening` as usual: `{ "video": "ruler" }`.

### Choosing the completion judge

* **`judge: "code"` (preferred)** — when completion is observable from the game's runtime output. The frontend decides and the success dialog opens instantly; the Copilot then receives a "Course completed" event and fills in a one-sentence comment. Two signals:
  * **`complete.log` + `count`**: for collect-N goals — completion is `count` DISTINCT output lines containing `log`, within a single run (re-running resets the count).
  * **The sentinel (default)**: the project prints `@@builder:course-complete@@` from its own goal logic.
* **`judge: "copilot"`** — only when completion cannot be judged from output (e.g. "message the Copilot" — a course that judges what the user *says* rather than what their program *does*). State the criteria in the prose; the Copilot declares success (this mode inherently costs one LLM round).

### Primary and secondary goals

The runtime signal above is the **primary goal**: it says the learner reached the goal. Some courses also
care *how* — "collect all four, using `repeat`" — and manual code reaches the same goal, so the primary
goal alone would pass a solution that skips the lesson. `complete.require` adds a **secondary goal**,
checked only once the primary one lands:

```jsonc
"complete": {
  "log": "捡到", "count": 4,
  "require": { "code": ["repeat"], "hint": "这次是一步步走完的，试着用 repeat 让它重复吧。" }
}
```

`code` lists tokens that must appear in the learner's code as whole words — comments and string
literals are stripped first, so the course's own "试试 repeat" hint in the starter code cannot satisfy
it. Both goals met → the course completes as usual. Primary met, secondary missed → no completion;
a modal credits the run ("你的程序已经达成目标了。") and shows `hint`, which is **Markdown** — name the
code it asks for in backticks, the way the rest of the app writes code. Written this way, a course that
would otherwise need `judge: "copilot"` — "must have used `repeat`" — stays on the instant code path.

Keep `hint` specific about what is still missing, and keep the token list short: it is a check on the
approach, not a code-style grader.

### The fast path

Declaring `apis` or `opening` (or the legacy `videos`) switches the Copilot's opening protocol to purely silent (verdict + stay-silent, no tool calls) — the frontend owns all course-start setup. Courses declaring none keep the legacy Copilot-driven setup. New courses should always declare.

## Three kinds of video, don't confuse them

* **Opening story video** — the series intro (world & goal), usually only on the first course. It is the one opening piece still authored as a tag rather than an `opening` entry, because it plays *before* the editor exists (before the course even starts) and carries its own source check. Authored as `<course-story-video>URL</course-story-video>` in the prompt (put it after the jsonc block). Orthogonal to `judge` / `apis` / `opening`.
* **Knowledge-point videos** (the `opening` `video` steps) — an API's explainer, played in a dialog in `opening` order after the editor loads.
* **Hover-card video** — the same API explainer, always available on hover during the course; no config.

Story-video sources are **origin-restricted** (the `?video=` query param is spoofable): allowed origins are same-origin, `usercontentBaseUrl`, and the tutorial video host (`tutorialVideoAssetBaseUrl` in `api-videos.ts`, an S3 bucket during the demo phase). A URL on any other origin is silently dropped. Because the site is cross-origin isolated (COEP), cross-origin videos need `<video crossorigin>` plus the bucket's CORS (all three video surfaces already set it).

## The prose (the Copilot's lesson plan)

The opening guide line now lives in the config's `opening.prelude`, not a `<course-prelude>` tag. Recommended prose sections (see the Code: Lita series): `## 目标`, `## 当前代码` (with a reference answer marked as one-of-many), `## 完成判定`, optional `## 引导要点`. Do not write "narrow the APIs at start" / "play the video at start" / "spotlight the button first" prose — the config's `apis` / `opening` already do that, and such prose conflicts with the silent opening protocol. For `judge: "code"` courses, state explicitly that the system judges and the Copilot must not declare completion. Prompt limit: 4000 characters.

## Scene rules the courses depend on

A course's scene is part of its judging, so a scene that can reach a state the goal can never be
met from is a course the learner cannot finish — and nothing in the config can catch that.

The one we hit: a mushroom that ripens over time is picked up on `onTouchStart`, which fires when
contact *begins*. A learner who walks onto the sprout and then waits for it has already spent that
event, so ripening handed them nothing and the run was a dead end. Ripening is the other moment a
pickup can happen, so the mushrooms check for it:

```
func harvest() { play "获得蘑菇"; println "捡到蘑菇 "+name; collected = true; die }

onTouchStart "Lita", sprite => { if mature { harvest } else { sprite.say "还没熟呢", 1 } }
// ... and where it ripens:
mature = true
if touching("Lita") { harvest }
```

Write scenes so that every state a learner can reach still leads somewhere. Prefer fixing the scene
over writing prose that steers around the sharp edge: the prose only reaches learners who read it,
and a course should not need the reference answer's exact shape to be completable.

## Workflow for a new course

1. Build the course project; make the game print a judgeable output line per key progress step (or print the sentinel when the goal is reached).
2. Pick the judge: output-observable → `judge: "code"` + `complete` (add `complete.require` when the goal can be reached without the technique the course teaches); otherwise → `judge: "copilot"` + written criteria.
3. Write the config block: `hide` / `apis` (the union across the whole course) / `opening` (the prelude line + this course's new knowledge-point videos + the spotlight for the control to act on, in order).
4. Write the prose sections.
5. Add to the series and export the `.xbcs.zip` archive.

## State of the Code: Lita series (after the 2026-08 rebuild)

Series "Code: Lita", **53 courses** (projects `curator/Lita-Course-01`…`-53`), fully structured. The
world is squirrel-and-mushroom: goals are collecting mushrooms (four colors) and pinecones, and the
projects log one line per pickup (`捡到蘑菇 <name>` / `捡到松果 <name>`), so a course collecting both
kinds counts them with the shared prefix `complete: { "log": "捡到", "count": N }`.

Unit order: movement basics (1–13) → targets (14–18) → objects & the boat (19–23) → **loops
(24–30)** → `onStart` (31) → **conditions (32–38)**, staged as observe-the-problem (32 看运气的采摘)
→ meet the query (33 问一问蘑菇, `IsMature` alone) → `if` (34) → `if/else` (35) → transfer to a new
scene (36 大挑战 II) → `waitUntil` / `Water` (37–38) → **values (39–43)**: name a number (39), change
it (40), get one from `distanceTo` (41), feed it to `step` (42), store it in a variable (43) → 螺旋
(44) → counting (45–47, `==` lands in 47 刚好数到四) → `for` unit (48–51) → events (52 谁在指挥,
`onKey` + `turnTo`) → capstone (53). Loops deliberately precede conditions — repetition is easier to
observe than branching — and `distanceTo` sits inside the value thread rather than next to the ruler
courses, because what makes it worth learning is that it *returns something you can use*. Every
syntax point enters through the designer's arc: the child observes a problem, the course suggests
the capability, the child writes it, then transfers it to a fresh scene.

* **51 courses** are `judge: "code"`; **2** are `judge: "copilot"` — course 1 (message the Copilot)
  and course 32 (say what you observed). Both judge what the learner *says*; no course judges code
  through the Copilot.
* **6 courses** add a secondary goal via `complete.require`: 42 (`distanceTo` — `stepTo` reaches the
  same mushroom), 25 / 28 / 30 (`repeat` — walking by hand collects everything too), 36
  (`if` + `IsMature` — going straight for the pinecone also scores), 47 (`if`).
* **51 courses** declare `apis` (courses 1 and 2 have no panel to narrow). **13** include a
  knowledge-point video; **11** include an opening spotlight — the Copilot trigger (1), the Run
  button (2), the Ruler (3, 7, 9, 10, 11, and 41, where it bridges into `distanceTo`), the API
  References panel (4), and the sprite → name-label chain that teaches name insertion (14 on a
  mushroom, 20 on the boat).
* **Course 1** carries the `<course-story-video>` series intro.
* Course covers are placeholders except for the few the designer has delivered.
