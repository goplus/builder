# Tutorial Class Framework

`tools/tutorial` is the class framework for Playground Courses. A Playground Course is an XGo program, `main_course.gox`,
that runs next to an embedded SPX project. It tells the learner what to do, watches what they do in the editor, and
decides when the goal is reached. The framework turns these calls into capabilities of the host, the Tutorial module in
spx-gui, and delivers host events back to the course's callbacks. It runs on the framework-neutral
[XGo Executor](../xgoexec/).

This README is a guide for course authors. The contracts remain the source of truth:
[`tutorial-class-framework.go`](../../docs/develop/tutorial-v2/tutorial-class-framework.go) for the author-facing API and
[`module_TutorialFramework.ts`](../../docs/develop/tutorial-v2/module_TutorialFramework.ts) for the host side. Where this
guide and a contract disagree, the contract wins and this guide is out of date.

中文版：[README.zh.md](./README.zh.md)

## Course project layout

| Path | Purpose |
| --- | --- |
| `index.json` | Framework configuration. `project.type` and `project.root` locate the embedded learner project, `copilotContext` holds instructions for Copilot that the learner never sees, and `inEditorPath` is the editor path to open at, such as `/simple/sprites/Lita`. |
| `main_course.gox` | The course program. |
| `project/` | An ordinary serialized SPX project. While the learner works, it becomes an in-memory project with no owner. |
| `assets/videos/<name>/index.json` | Declares the video `<name>`. Its `path` points to the video file, relative to that directory. Course code refers to the video by `<name>` only. |
| `assets/images/<name>/index.json` | Declares the image `<name>` the same way. No course API addresses images yet; they are kept with the course for APIs that will. Names are unique within each resource type, so a video and an image may share one. |

The [example course](../../docs/develop/tutorial-v2/example-tutorial-course/) is a complete directory.

## A first course

This is the example course's `main_course.gox`:

```go
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	Spotlight.reveal "api-references", "Here is stepTo, the only block you need in this lesson."
}

// Only the latest "reached-target" matters: a newer signal cancels a
// judgement that is still waiting on Copilot.
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

When the course starts, it limits the Code Editor to one API, shows the task, plays a video and highlights the API
list. Then it waits. The learner's project prints `reached-target` when Lita touches Mushroom (`println "reached-target"`
in `Mushroom.spx`), and the `onLog` callback turns that signal into a completion with generated feedback. `judging` is a
run group: if a second `reached-target` arrives while Copilot is still generating feedback for the first, the earlier
judgement is cancelled and the newer one counts. [Run groups](#run-groups) explains this.

This is the usual pattern. The learner's project prints an agreed log line when something happens, and the course listens
for it with `Editor.Runtime.onLog`.

## Writing course code

### Calling conventions

- Methods of the course itself are called without a prefix: `showMessage "Hi"`, `complete`.
- Namespaces start with a capital letter and their methods with a lower-case one: `Editor.CodeEditor.filterAPIs`,
  `Copilot.generateText`, `Spotlight.reveal`. Namespace segments are fields, and XGo converts only method names.
- A call used as a statement can use command style, without parentheses. A call whose result is used needs parentheses,
  because a command-style call is not an expression.
- `onXxx param => { ... }` registers a callback. Callbacks without a payload omit the parameter.

```go
onStart => {
	showMessage "Hello"
	Editor.Ruler.enable
	code := Editor.Project.getCode("Lita")
	echo code
}
```

### Top-level code and course start

Top-level statements in `main_course.gox` run once when the program starts. Use them to declare shared state and
register callbacks. After they finish, the course start is delivered to every `onStart` callback, so every callback is
already registered when the opening flow runs.

Declarations come first. The top-level statements form the body of the course's entry function, and every `func` must be
declared before the first of them. A `func` written after a statement is read as a function literal, and the course does
not compile: `expected '(', found <name>`. Keep `type` declarations at the top as well, so the file reads top-down.

A callback can also register other callbacks. They take effect from the next event. An `onStart` callback registered
after the course has started never runs.

### Execution model

- **One run at a time.** Course callbacks execute as runs. At any instant only one run executes course code, so
  variables shared between callbacks never race and course code needs no locks.
- **Waiting calls let other runs go.** `showPrelude`, `showMessage`, `showVideo`, `generateText` and `generateJSON` wait
  for the learner or for generation. While one run waits, other runs keep going, including other runs of the same
  callback, so shared state may have changed by the time the call returns.
- **Runs may overlap.** Every trigger starts a new run of each callback registered for it. A trigger that arrives while
  an earlier run is still waiting starts a second run, and the two interleave at waiting points. Runs are independent
  unless a [run group](#run-groups) relates them.
- **Starts are ordered.** Triggers are handled in arrival order. Within one trigger, the callbacks start in registration
  order, each running to its first wait or its end before the next starts, and proceed independently from there. A run
  started with `start` begins when the starting run next waits or ends. Steps that must happen in order belong in one
  callback.
- **Presentations are not serialized.** When runs request `showPrelude`, `showMessage` or `showVideo` at the same time,
  the host decides whether the later call waits for its turn, is rejected, or dismisses the earlier one. Keep a
  sequence of presentations in one callback. Spotlight is not a presentation: `reveal` returns as soon as the highlight
  is shown and can stay on screen together with a dialog.
- **There are no timers.** The framework has no `sleep` and no scheduler. A course reacts to events and to the learner
  finishing a presentation.

```go
onStart => {
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	showMessage "Now try it yourself."
}
```

### Run groups

A run group relates runs that would otherwise overlap. It holds at most one run at a time, and its policy decides what
happens when a run of the group is started while another run still holds it:

| Policy | While the group is held | Use it for |
| --- | --- | --- |
| `CancelPrevious` | The run holding the group is cancelled and the new run takes its place. | Triggers where only the latest counts: judging when the project exits or a Copilot round completes. |
| `OneAtATime` | The new run waits its turn and begins when the holder ends. | Triggers that must each be handled in full and in order, such as one hint per failed attempt. |
| `SkipWhileBusy` | The new run never starts. | Signals that repeat while a condition holds, such as a line the project prints every frame: judge once, ignore the rest. |

A trigger that fires once per learner action, such as the project exiting or a Copilot round completing, suits
`CancelPrevious`: the learner acted again, so the earlier judgement is stale. A signal that repeats on its own while
nothing changed suits `SkipWhileBusy`: the repeats carry no news, and cancelling for each of them would never let a
judgement finish.

`newRunGroup policy` creates a group, and `start` starts a run of it:

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

`start` does not wait for the run it starts. The new run begins when the calling run next waits or ends, and the
statements after `start` are not part of it: they still belong to the calling run, and the two interleave at waiting
points like any other runs. Everything the policy must protect goes inside the braces. Create groups at the top level: a
group created inside a callback is new for every run and relates nothing.

#### Binding a callback to a group

Every event registration, `Editor.Runtime.onStart`, `onExit` and `onLog` as well as `Copilot.onRoundComplete`, accepts a
group or a policy as an optional first argument, which makes the whole callback one run of the group:

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onExit judging, code => {
	showMessage "You stopped the project. Did Lita reach Mushroom?"
}
```

This is exactly:

```go
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onExit code => {
	judging.start => {
		showMessage "You stopped the project. Did Lita reach Mushroom?"
	}
}
```

A bare policy, `Editor.Runtime.onExit OneAtATime, code => { ... }`, stands for an anonymous group private to that
callback. Without either, runs of the callback are independent and may overlap.

Put the group where the work is, not on the trigger. A callback that filters its triggers keeps the plain form and calls
`start` after the filter: bound as a whole to `CancelPrevious`, the `onLog` callback above would make every line the
project prints a run of the group, and every unrelated print would cancel a judgement in progress. `onExit` has nothing
to filter, so it can be bound at registration.

#### One group across events

The group records which run holds it, never which callback started that run. One group shared by callbacks of different
events therefore relates their runs exactly like runs of one callback: a judgement started from `onExit` cancels one
started from `onLog`, and the other way round. This is what groups are for.

```go
type Verdict struct {
	Passed  bool
	Comment string
}

func judge(trigger string) {
	prompt := "The learner " + trigger + ". Does this code walk Lita to Mushroom with stepTo?\n" + Editor.Project.getCode("Lita")
	verdict := &Verdict{}
	Copilot.generateJSON prompt, verdict
	if verdict.Passed {
		completeWith verdict.Comment
		return
	}
	showMessage verdict.Comment
}

judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
		judge("made the project print reached-target")
	}
}

Editor.Runtime.onExit judging, code => {
	judge("stopped the project")
}

Copilot.onRoundComplete judging, round => {
	judge("asked Copilot about: " + round.UserMessage)
}
```

A learner who runs the project, gets `reached-target` and stops it while Copilot is still judging sees one verdict: the
exit cancels the judgement the log started. The
[run-groups example](../../docs/develop/tutorial-v2/example-tutorial-course-run-groups/) is a complete course built this
way, with hints queued through a second group.

#### What cancellation does

Cancellation takes effect at waiting points and is quiet. A cancelled run ends at its next waiting call: if it is
waiting, the call's result is discarded when the host settles it, so a `generateJSON` struct is never filled; otherwise
it ends before making its next waiting call. Statements between two waits still run. The host is not told: a dialog the
cancelled run has opened is not withdrawn, and the learner still closes it. Cancellation is not an error, and the course
goes on.

#### Hints one at a time

```go
attempts := 0

Editor.Runtime.onExit OneAtATime, code => {
	attempts++
	if attempts >= 3 {
		showMessage "Hint: stepTo takes a sprite name, like stepTo Mushroom."
	}
}
```

Three quick stops show three hints one after another instead of three dialogs at once. A run waiting its turn costs
nothing and holds nothing else up; it begins when the previous run ends, so `attempts++` for a queued run happens after
the earlier hint was dismissed. After `complete`, runs still waiting their turn never begin.

#### Rules

- A run of a group must not start a run of the same group. Under `CancelPrevious` it would cancel itself, under the
  other two policies the new run could never begin. The framework reports it as an error and the course fails.
- A callback on a frequent event never waits outside a group. Filter first, then `start`.
- Shared state a run updates should be updated before its first waiting call, because other runs go on while it waits.

### Busy events

Every trigger of an event starts a run of each of its callbacks, and a run that reaches a waiting call stays in flight
until the learner or generation answers. A callback that waits on every trigger of a busy event therefore piles up runs
while the event keeps firing, for example an `onLog` callback that opens a dialog for every line the game prints. Each
of those runs requests its own dialog or generation.

Keep waiting calls off the common path of busy events. Return early for triggers that do not matter, so that most runs
finish immediately, and let a group with `SkipWhileBusy` absorb a signal that repeats while a condition holds:

```go
touching := newRunGroup(SkipWhileBusy)

Editor.Runtime.onLog log => {
	if log != "touching-mushroom" {
		return
	}
	touching.start => {
		showMessage "Lita is touching Mushroom. Stop the project when you are done."
	}
}
```

While the dialog is open, the project keeps printing `touching-mushroom` every frame, and every one of those triggers
is dropped at `start`. With `CancelPrevious` each frame would cancel the run before it and the dialog would never stay.

Events that have not been delivered yet wait in a queue of at most 1024. Runs hand control back whenever they wait, so
a healthy course stays far below that limit. The queue fills only when a run never hands control back, such as a loop
that never reaches a waiting call. Nothing else in the course runs meanwhile, further events are rejected and reported
to the host as errors, and a signal the course waits for may never arrive.

### Completion

`complete` and `completeWith message` end the course:

- No new trigger starts a run, events still waiting in the queue are dropped, and a run that was started but has not
  begun, waiting its turn under `OneAtATime` or not, never begins.
- Runs already executing or waiting finish their remaining statements, including the statements after `complete`,
  unless one of their calls fails or is cancelled.
- Only the first `complete` or `completeWith` counts. Later calls do nothing.
- The program then ends. The Playground accepts the completion at once and ends the program's session: a presentation
  or generation still pending is cancelled, and nothing requested after that reaches the learner. The course is
  completed either way, even if the program's own exit is reported as an error because a pending call was cancelled.
  Put the farewell in `completeWith`, not in a `showMessage` after `complete`.

`completeWith` shows its message to the learner as feedback. The first course above generates that message from the
learner's code.

## API reference

### Course

| Call | Returns | Notes |
| --- | --- | --- |
| `onStart => { ... }` | | Registers a course-start callback. |
| `showPrelude message` | After the learner dismisses it | Shows the opening task guide. It differs from `showMessage` only in how the host presents it. |
| `showMessage message` | After the learner dismisses it | Shows a dialog. |
| `showVideo name` | After the learner finishes watching | Plays the declared video `name`, not a file path. The host decides what counts as finished. |
| `complete` | Immediately | Ends the course without feedback. See [Completion](#completion). |
| `completeWith message` | Immediately | Ends the course and shows `message` as feedback. |
| `newRunGroup(policy)` | A run group | `policy` is `CancelPrevious`, `OneAtATime` or `SkipWhileBusy`. See [Run groups](#run-groups). |

Presentations never advance on their own.

### RunGroup

| Call | Returns | Notes |
| --- | --- | --- |
| `group.start => { ... }` | Immediately | Starts a run of the group executing the body. The run begins when the calling run next waits or ends; the group's policy decides what happens if another run holds the group. |

A group, or a bare policy, may also be given as the first argument of any event registration below, which makes the
whole callback one run of the group.

### Editor.Project

Reads the learner's project model, not the editor's UI state.

| Call | Returns | Notes |
| --- | --- | --- |
| `Editor.Project.getCode(sprite)` | The sprite's current code | `sprite` is a sprite name such as `"Lita"`, not a file name. Naming a sprite the project does not have fails the course. |
| `Editor.Project.listSprites()` | Sprite names | For courses where the learner creates and names a sprite. |

```go
for sprite <- Editor.Project.listSprites() {
	echo sprite, Editor.Project.getCode(sprite)
}
```

### Editor.Runtime

Observes runs of the learner's project, not the course program.

| Callback | Called when |
| --- | --- |
| `Editor.Runtime.onStart => { ... }` | The learner's project starts running. |
| `Editor.Runtime.onExit code => { ... }` | The learner's project exits. `code` is the exit code. Exiting does not mean the goal was reached. |
| `Editor.Runtime.onLog log => { ... }` | The learner's project prints a log line, once per line and in output order. Runtime errors are not part of this channel. This is the main way to detect what the learner achieved. |

Each of the three accepts a run group or a policy before the callback: `Editor.Runtime.onExit judging, code => { ... }`,
`Editor.Runtime.onExit OneAtATime, code => { ... }`.

```go
Editor.Runtime.onStart => {
	echo "the learner's project started"
}

Editor.Runtime.onExit code => {
	echo "the learner's project exited with code", code
}
```

### Editor.CodeEditor

| Call | Returns | Notes |
| --- | --- | --- |
| `Editor.CodeEditor.filterAPIs apis` | Immediately | Limits the APIs offered by Code Editor assistance. Each entry is a full definition identifier, `xgo:<package>?<name>#<overloadId>`. Omitting `#<overloadId>` includes every overload of the name. Short names such as `"stepTo"` are not accepted. |
| `Editor.CodeEditor.formatWorkspace` | After formatting is done | Formats the learner's code. |

```go
onStart => {
	Editor.CodeEditor.filterAPIs [
		"xgo:github.com/goplus/spx/v3?Sprite.stepTo",
		"xgo:github.com/goplus/spx/v3?Sprite.say",
	]
}
```

### Editor.Ruler

| Call | Notes |
| --- | --- |
| `Editor.Ruler.enable` | Turns on the ruler over the stage. |
| `Editor.Ruler.disable` | Turns off the ruler. |

```go
onStart => {
	Editor.Ruler.enable
	showMessage "Look at the coordinates on the stage."
	Editor.Ruler.disable
}
```

### Copilot

Calls from course code never appear in the learner's Copilot conversation.

| Call | Returns | Notes |
| --- | --- | --- |
| `Copilot.onRoundComplete round => { ... }` | | Called when the learner completes a round with Copilot. `round.UserMessage` is the learner's message and `round.ResultMessages` holds the replies. A run group or a policy may precede the callback. |
| `Copilot.generateText(message)` | The generated text | Waits for generation. |
| `Copilot.generateJSON message, result` | After `result` is filled | Waits for generation. |

`generateJSON` derives a JSON Schema from the struct type of `result` and fills the struct with the generated value:

- `result` must be a non-nil pointer to a struct.
- Only exported fields are used. A lower-case field cannot be filled and is ignored, and at least one usable field is
  required.
- `json` tags rename fields, and `json:"-"` excludes one. Every other field is required in the schema.
- Supported field types are strings, booleans, integers, floating-point numbers, nested structs, and pointers, slices or
  arrays of supported types. Maps, interfaces, channels, recursive types and embedded fields without a `json` name are
  rejected.

```go
type Review struct {
	Correct    bool
	Suggestion string
}

Editor.Runtime.onExit code => {
	question := "Does this code move Lita to Mushroom?\n" + Editor.Project.getCode("Lita")
	review := &Review{}
	Copilot.generateJSON question, review
	if review.Correct {
		complete
	} else {
		showMessage review.Suggestion
	}
}
```

### Spotlight

| Call | Notes |
| --- | --- |
| `Spotlight.reveal target, tip` | Highlights `target`, shows `tip` beside it and dims the rest of the screen until the learner clicks anywhere. |
| `Spotlight.revealWith target, tip, options` | The same, with explicit `SpotlightOptions`. |

Both return as soon as the highlight is shown. They never wait for it to be dismissed.

- `target` is a Radar selector. Names are the stable, lowercase kebab-case roles the editor UI gives its elements, such
  as `code-text-editor`, `simple-code-editor`, `stage-overview`, `ruler` or `api-references`. A space means "inside",
  and `[attribute="value"]` narrows a name by one of its attributes: `api-reference[name="Sprite.stepTo"]` selects the
  `stepTo` entries of the API reference. The value is a JSON string, so write such a selector as a raw string, as in
  the example below. Names and values are compared exactly, case included. The full grammar is in
  [`module_Radar.ts`](../../docs/develop/tutorial-v2/module_Radar.ts). Radar node IDs are generated per session and are
  not valid targets. A selector that matches several elements highlights them together.
- `SpotlightOptions{Mask, Duration}`: `Mask` dims everything except the target. `Duration` hides the highlight after
  that many seconds, and `0` keeps it until the learner clicks anywhere. `reveal` uses `Mask: true, Duration: 0`.
- A malformed selector fails the course. A valid selector that matches nothing at the moment, for example an API hidden
  by `filterAPIs`, is not an error: the host retries briefly, then skips the highlight and logs a warning.

```go
onStart => {
	Spotlight.reveal `api-reference[name="Sprite.stepTo"]`, "stepTo is the only block you need"
}

Editor.Runtime.onStart => {
	Spotlight.revealWith "stage-overview", "Watch where Lita goes", SpotlightOptions{Mask: false, Duration: 3}
}
```

## When a call fails

If a call cannot do what it promises, the course program stops with an error and the run is reported as `error`. For
example:

- `getCode` names a sprite the project does not have.
- A spotlight selector is malformed.
- Generation fails, or its result cannot be decoded.
- `generateJSON` receives an unsupported `result`.
- A run of a group starts a run of the same group.

This is deliberate. A course that continued after a failed read or a dialog that never appeared could judge the learner
wrongly. Failures of this kind are authoring mistakes and should surface while the course is being tried. The one
exception is a well-formed spotlight selector that currently matches nothing, described above.

## Trying a course locally

With the spx-gui dev server running, open `/debug/tutorial-courses`. The page runs course source against a mock host
that logs every capability call and answers with fixed values. Scripted cases dispatch events and pass when the run
completes. The free-form runner takes any `main_course.gox` source and lets you dispatch runtime logs by hand. Because
the mock host answers at once, no run is ever waiting there, so the page cannot show a cancellation.

## Changing the framework

Read [AGENTS.md](./AGENTS.md) first. It lists the scheduler rules, how to classify a new capability, the two-sided wire
contract with `client.ts`, and the qexp export that `tools/xgoexec-bundle` regenerates after the exported API changes.
Update the contracts in `docs/develop/tutorial-v2` together with the code.
