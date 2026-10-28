# Example Tutorial Course: run groups

This directory is a second Playground Course, built around the run groups of the Tutorial Class Framework. The lesson is the one in [`example-tutorial-course`](../example-tutorial-course/), walk Lita to Mushroom with `stepTo`, and the embedded project is the same; what differs is `main_course.gox`, which judges from three triggers and shows hints, so that overlapping runs actually happen.

```text
example-tutorial-course-run-groups/
├── index.json
├── main_course.gox
└── project/            (identical to example-tutorial-course/project/)
```

## What the program shows

| Trigger | What the callback does | Group and policy | Why |
|---|---|---|---|
| `Editor.Runtime.onLog` with `reached-target` | filters, then `judging.run => { judge(...) }` | `judging`, `CancelPreviousPolicy` | Logs arrive for every print; only the signal may touch the group |
| `Editor.Runtime.onExit` | `judging.run => { judge(...) }` | `judging`, `CancelPreviousPolicy` | An exit cancels a judgement still waiting |
| `Copilot.onRoundComplete` | `judging.run => { judge(...) }` | `judging`, `CancelPreviousPolicy` | Same group as the other two |
| `Editor.Runtime.onExit`, hints | counts the stop, then `hints.run => { showMessage ... }` | `hints`, `QueuePolicy` | Independent of judging; hints queue instead of piling up, and the callback waits for its hint |

The group holds at most one judging run, whichever callback started it. A learner who runs the project, gets `reached-target`, then stops it while Copilot is still judging sees one verdict: the exit cancels the judgement the log started, and that judgement's result is discarded when it arrives. A Copilot round completing does the same to either.

Every callback is a plain registration; the group only enters where the work that must not overlap is, inside the braces after `run`. The filter stays outside: were the whole log callback one run of `judging`, every unrelated print would cancel a judgement in progress. Note the order of the file: `type` and `func` declarations come before `judging := ...`, because in a classfile every declaration has to precede the top-level statements that form the entry body.

## Trying it

The Tutorial courses debug page runs this program against a mock host as the case "Run groups example course"; `tools/xgoexec-bundle`'s build test compiles it through the real classfile pipeline. The mock host answers at once, so it cannot show a cancellation, which needs a judgement to be slow; `tools/tutorial`'s unit tests cover that.
