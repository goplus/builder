# Example Tutorial Course: run groups

This directory is a second Playground Course, built around the run groups of the Tutorial Class Framework. The lesson is the one in [`example-tutorial-course`](../example-tutorial-course/), walk Lita to Mushroom with `stepTo`, and the embedded project is the same; what differs is `main_course.gox`, which judges from three triggers and shows hints, so that overlapping runs actually happen.

```text
example-tutorial-course-run-groups/
├── index.json
├── main_course.gox
└── project/            (identical to example-tutorial-course/project/)
```

## What the program shows

| Trigger | Form | Group and policy | Why |
|---|---|---|---|
| `Editor.Runtime.onLog` with `reached-target` | filter, then `judging.start => { ... }` | `judging`, `CancelPrevious` | Logs arrive for every print; only the signal may touch the group |
| `Editor.Runtime.onExit` | `onExit judging, code => { ... }` | `judging`, `CancelPrevious` | The whole callback is one run of the group |
| `Copilot.onRoundComplete` | `onRoundComplete judging, round => { ... }` | `judging`, `CancelPrevious` | Same group as the other two |
| `Editor.Runtime.onExit`, hints | `onExit OneAtATime, code => { ... }` | anonymous, `OneAtATime` | Independent of judging; hints queue instead of piling up |

The group holds at most one judging run, whichever trigger started it. A learner who runs the project, gets `reached-target`, then stops it while Copilot is still judging sees one verdict: the exit cancels the judgement the log started, and that judgement's result is discarded when it arrives. A Copilot round completing does the same to either.

`onExit judging, code => {B}` is exactly `onExit code => { judging.start => {B} }`. Note the order of the file: `judge` is declared before `judging := ...`, because in a classfile every `func` declaration has to precede the top-level statements that form the entry body. The log callback cannot use that form, because the filter has to stay outside the group: bound as a whole, every unrelated print would cancel a judgement in progress.

## Trying it

The Tutorial courses debug page runs this program against a mock host as the case "Run groups example course"; `tools/xgoexec-bundle`'s build test compiles it through the real classfile pipeline. The mock host answers at once, so it cannot show a cancellation, which needs a judgement to be slow; `tools/tutorial`'s unit tests cover that.
