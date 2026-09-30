# Example Tutorial Course

This directory illustrates one Playground Course before its files are uploaded:

```text
example-tutorial-course/
├── index.json
├── main_course.gox
├── project/
│   ├── main.spx
│   ├── Lita.spx
│   ├── Mushroom.spx
│   └── assets/
│       ├── index.json
│       ├── backdrop.svg
│       └── sprites/
│           ├── Lita/
│           │   ├── index.json
│           │   └── default.svg
│           └── Mushroom/
│               ├── index.json
│               └── default.svg
└── assets/
    └── videos/
        └── step-to/
            ├── index.json
            └── step-to.mp4
```

`index.json` is the Tutorial Class Framework configuration. It locates the embedded SPX project, supplies Course-author-provided Copilot instructions that are not shown in the learner UI and selects the initial in-editor path.

`main_course.gox` is the conventional entry file for the Course-author-written XGo program. `project/` is an ordinary serialized SPX project that becomes an ownerless in-memory project while the learner works. The root `assets/` contains Course-local resources addressed by the Tutorial program; `assets/videos/step-to/index.json` declares the video resource and points to `step-to.mp4` relative to its own directory. It is independent of `project/assets/`, which belongs to the embedded SPX project.

After upload, `PlaygroundCourse.content` does not contain these file bodies directly. It contains a `FileCollection` whose keys are the relative paths shown here and whose values are universal URLs. Course APIs and PostgreSQL preserve that mapping without parsing this directory's internal contracts.

The files are intentionally small and focus on format and ownership boundaries rather than forming a production-ready lesson.

## Presentation and lifecycle

`showPrelude` presents a Markdown opening task guide. `showMessage` presents a
Markdown message during the Course. Both return only when the learner dismisses
the dialog. `showVideo "step-to"` resolves the declared Course-local resource by
name, retains the player for replay after playback ends, and returns when the
learner clicks Continue or explicitly closes it. The example MP4 is an empty
format placeholder; replace it with a playable video before previewing.

Put presentations that should run in sequence in the same callback:

```go
onStart => {
    showPrelude "**Goal:** move Lita to Mushroom using `stepTo`."
    showVideo "step-to"
    showMessage "Try the project, then revise your code."
}
```

The Host opens each presentation call immediately. It does not queue or replace
concurrent calls; authors avoid overlapping calls when stacked dialogs would be
inappropriate. Completion closes pending presentation and makes subsequent
presentation calls no-ops. Already-started callbacks, including in-flight
Copilot generation, finish before the completion dialog appears. Leaving or
replacing the Course stops its execution and cancels pending generation.

`Editor.Project.getCode("Lita")` reads the current session project's sprite code;
`Editor.Project.listSprites()` discovers names added by the learner.
`Editor.CodeEditor.formatWorkspace` formats the current Course workspace and
returns after formatting finishes. `Editor.Ruler.enable` and
`Editor.Ruler.disable` control availability of the ruler tool.
