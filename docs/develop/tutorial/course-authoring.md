# Authoring a tutorial course

A course is driven by its **prompt**. Beyond the natural-language instructions for the copilot,
the prompt may embed a few author-controlled sections that the frontend reads directly (the
copilot does not control them). They are all optional.

## Workspace config (`jsonc` block)

Put a single fenced `jsonc` (or `json`) code block in the prompt to configure the editor
workspace for the course. It is applied once when the course starts.

````
```jsonc
{
  // Panels/areas to hide, to reduce distraction. Omit to hide nothing.
  "hide": ["editor-panels", "edit-mode-switch", "preview-header", "code-editor-tools"],
  // "open" starts the course with the copilot panel showing. Omit for the default hidden start.
  "copilot": "open"
}
```
````

### `hide`

An array of workspace area names to hide. Available areas:

- `editor-panels` — the sprites / sounds / stage panels below the game preview.
- `edit-mode-switch` — the editor-mode (default / map) switcher in the navbar.
- `preview-header` — the header bar of the game preview (title, publish entry, etc.).
- `code-editor-tools` — the tools beside the code editor (document tabs & zoom control).

Unknown names are ignored. Omitting `hide` (or the whole block) hides nothing.

Narrowing the **API References** panel is not configured here — the copilot does it at the course
start, based on the course goal and the reference project. Just make sure the course prompt makes
the intended APIs clear.

### `copilot`

By default the course starts with the copilot hidden, running in the background — it perceives
events silently and only surfaces when it has something to show. A course whose subject IS the
copilot (e.g. the very first lesson, "meet your copilot") declares `"copilot": "open"` to start
with the panel showing. Any other value keeps the default.

## Story video (`<course-story-video>`)

Plays a video before the course starts, typically to introduce a series' world & goal on its
first course.

```
<course-story-video>/tutorial-intro/opening.webm</course-story-video>
```

The URL must be same-origin or on the usercontent host (arbitrary origins are rejected). Omitting
the section plays no story video.

## Prelude (`<course-prelude>`)

Shows a short text guide in a dialog before the course starts (after the story video, if any).

```
<course-prelude>向前走，把萝卜都捡起来！</course-prelude>
```

## Knowledge-point videos

If the prompt declares the course's new knowledge points, the copilot plays the matching
explainer videos at the course start (and on request). This is natural-language, not a config
block — e.g. a `## 新知识点` / `## Knowledge points` section listing the APIs. A video is shown
only for APIs that have one in the library.

## What the copilot still controls

The copilot does **not** touch the hidden panels or the opening dialogs. It does narrow the API
References panel at the course start (based on the course goal), and it guides the user during the
course — with hints, spotlights, videos and in-editor code guides — only as strongly as the
intervention level allows (it stays silent until the user is genuinely stuck). Completion is judged
against the criteria you write in the prompt.
