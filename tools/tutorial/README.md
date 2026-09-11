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
| `index.json` | Framework configuration. `project.type` and `project.root` locate the embedded learner project, `copilotContext` holds instructions for Copilot that the learner never sees, and `inEditorRoute` selects where the editor opens. |
| `main_course.gox` | The course program. |
| `project/` | An ordinary serialized SPX project. While the learner works, it becomes an in-memory project with no owner. |
| `assets/videos/<name>/index.json` | Declares the video `<name>`. Its `path` points to the video file, relative to that directory. Course code refers to the video by `<name>` only. |

The [example course](../../docs/develop/tutorial-v2/example-tutorial-course/) is a complete directory.

## A first course

This is the example course's `main_course.gox`:

```go
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	// TODO(#3441): "API References" is the target's Radar node name; revisit
	// once the Radar name-based selector syntax is settled.
	Spotlight.reveal "API References", "Here is stepTo, the only block you need in this lesson."
}

Editor.Runtime.onLog log => {
	if log == "reached-target" {
		code := Editor.Project.getCode("Lita")
		feedback := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		completeWith feedback
	}
}
```

When the course starts, it limits the Code Editor to one API, shows the task, plays a video and highlights the API
list. Then it waits. The learner's project prints `reached-target` when Lita touches Mushroom (`println "reached-target"`
in `Mushroom.spx`), and the `onLog` callback turns that signal into a completion with generated feedback.

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
	Editor.Ruler.show
	code := Editor.Project.getCode("Lita")
	echo code
}
```

### Top-level code and course start

Top-level statements in `main_course.gox` run once when the program starts. Use them to declare shared state and
register callbacks. After they finish, the course start is delivered to every `onStart` callback, so every callback is
already registered when the opening flow runs.

A callback can also register other callbacks. They take effect from the next event. An `onStart` callback registered
after the course has started never runs.

### Execution model

- **One callback runs at a time.** Variables shared between callbacks never race, and course code needs no locks.
- **Waiting calls let other callbacks run.** `showPrelude`, `showMessage`, `showVideo`, `generateText` and
  `generateJSON` wait for the learner or for generation. While one callback waits, other callbacks keep running, so
  shared state may have changed by the time the call returns.
- **A callback never overlaps with itself.** Each registered callback handles its triggers one at a time, in arrival
  order. A trigger that arrives while the callback is still running or waiting is queued. Logic that depends on the
  previous trigger therefore needs no guard.
- **Different callbacks are independent.** Several callbacks on the same event, including several `onStart` callbacks,
  run independently and may interleave at waiting points. There is no ordering between them, so steps that must happen
  in order belong in one callback.
- **Presentations never overlap.** At most one of `showPrelude`, `showMessage` and `showVideo` is on screen at a time.
  A presentation requested by another callback waits for its turn. Spotlight is not a presentation: `reveal` returns as
  soon as the highlight is shown and can stay on screen together with a dialog.
- **There are no timers.** The framework has no `sleep` and no scheduler. A course reacts to events and to the learner
  finishing a presentation.

```go
previous := ""
Editor.Runtime.onLog log => {
	if log == previous {
		showMessage "Same output as last time. Try changing something."
	}
	previous = log
}
```

While the dialog is open, the next log waits in the queue, so it is compared with the updated `previous`.

```go
onStart => {
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	showMessage "Now try it yourself."
}
```

### Busy events

Each callback queues at most 1024 pending triggers. A callback that stays in a waiting call while its event keeps
firing fills its queue, for example a dialog opened from `onLog` that the learner leaves open while the game keeps
printing. Once the queue is full, further triggers of that event are rejected and reported to the host as errors, and
none of the callbacks on that event receives them.

Keep waiting calls off the common path of busy events. Return early for triggers that do not matter, so that most
triggers finish immediately:

```go
Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	completeWith "Lita reached Mushroom!"
}
```

### Completion

`complete` and `completeWith message` end the course:

- No new events are delivered, and queued triggers that have not started are dropped.
- Callbacks already running or waiting run to their end, including the statements after `complete`. The host skips any
  presentation they request after completion.
- The program then exits, and the run is reported as `completed`.
- Only the first `complete` or `completeWith` counts. Later calls do nothing.

`completeWith` shows its message to the learner as feedback. The first course above generates that message from the
learner's code.

## API reference

### Course

| Call | Returns | Notes |
| --- | --- | --- |
| `onStart => { ... }` | | Registers a course-start callback. |
| `showPrelude message` | After the learner dismisses it | Shows the opening task guide. It differs from `showMessage` only in how the host presents it. |
| `showMessage message` | After the learner dismisses it | Shows a dialog. |
| `showVideo name` | After the learner finishes or closes it | Plays the declared video `name`, not a file path. |
| `complete` | Immediately | Ends the course without feedback. See [Completion](#completion). |
| `completeWith message` | Immediately | Ends the course and shows `message` as feedback. |

Presentations never advance on their own.

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
| `Editor.Ruler.show` | Shows the ruler over the stage. |
| `Editor.Ruler.hide` | Hides the ruler. |

```go
onStart => {
	Editor.Ruler.show
	showMessage "Look at the coordinates on the stage."
	Editor.Ruler.hide
}
```

### Copilot

Calls from course code never appear in the learner's Copilot conversation.

| Call | Returns | Notes |
| --- | --- | --- |
| `Copilot.onRoundFinish round => { ... }` | | Called when the learner finishes a round with Copilot. `round.UserMessage` is the learner's message and `round.ResultMessages` holds the replies. |
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

- `target` is a Radar selector built from the stable names the editor UI gives its elements, such as
  `"Code editor > Code text editor"`. Radar node IDs are generated per session and are not valid targets. The selector
  syntax is being settled in [#3441](https://github.com/goplus/builder/issues/3441). A selector that matches several
  elements highlights them together.
- `SpotlightOptions{Mask, Duration}`: `Mask` dims everything except the target. `Duration` hides the highlight after
  that many seconds, and `0` keeps it until the learner clicks anywhere. `reveal` uses `Mask: true, Duration: 0`.
- A malformed selector fails the course. A valid selector that matches nothing at the moment, for example an API hidden
  by `filterAPIs`, is not an error: the host retries briefly, then skips the highlight and logs a warning.

```go
onStart => {
	Spotlight.reveal "Code editor > Code text editor", "Write your code here"
}

Editor.Runtime.onStart => {
	Spotlight.revealWith "Stage overview", "Watch where Lita goes", SpotlightOptions{Mask: false, Duration: 3}
}
```

## When a call fails

If a call cannot do what it promises, the course program stops with an error and the run is reported as `error`. For
example:

- `getCode` names a sprite the project does not have.
- A spotlight selector is malformed.
- Generation fails, or its result cannot be decoded.
- `generateJSON` receives an unsupported `result`.

This is deliberate. A course that continued after a failed read or a dialog that never appeared could judge the learner
wrongly. Failures of this kind are authoring mistakes and should surface while the course is being tried. The one
exception is a well-formed spotlight selector that currently matches nothing, described above.

## Trying a course locally

With the spx-gui dev server running, open `/debug/tutorial-courses`. The page runs course source against a mock host
that logs every capability call and answers with fixed values. Scripted cases dispatch events and pass when the run
completes. The free-form runner takes any `main_course.gox` source and lets you dispatch runtime logs by hand.

## Changing the framework

Read [AGENTS.md](./AGENTS.md) first. It lists the scheduler rules, how to classify a new capability, the two-sided wire
contract with `client.ts`, and the qexp export that `tools/xgoexec-bundle` regenerates after the exported API changes.
Update the contracts in `docs/develop/tutorial-v2` together with the code.
