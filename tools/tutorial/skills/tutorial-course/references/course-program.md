# The course program

`main_course.gox` is the course program: an XGo program written against the Tutorial Class Framework, which runs next
to the learner's embedded project. The framework's members are already in scope, so the program never imports anything
to reach them.

The contracts remain the source of truth: [`tutorial-class-framework.go`](../../../../../docs/develop/tutorial-v2/tutorial-class-framework.go) for
the author-facing API and [`module_TutorialFramework.ts`](../../../../../docs/develop/tutorial-v2/module_TutorialFramework.ts) for the host side.
Where this guide and a contract disagree, the contract wins and this guide is out of date.

## A first course

This is the `main_course.gox` of the [example course](../../../../../docs/develop/tutorial-v2/example-tutorial-course/):

```go
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
	Spotlight.reveal "api-references", "Here is stepTo, the only block you need in this lesson."
}

Editor.Runtime.onLog log => {
	if log == "reached-target" {
		code := Editor.Project.getCode("Lita")
		feedback, err := Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)
		if err != nil {
			feedback = "Lita reached Mushroom. Well done!"
		}
		completeWith feedback
	}
}
```

When the course starts, it limits the Code Editor to one API, shows the task, plays a video and highlights the API
list. Then it waits. The learner's project prints `reached-target` when Lita touches Mushroom (`println "reached-target"`
in `Mushroom.spx`), and the `onLog` callback turns that signal into a completion with generated feedback, or with a
fixed line when generation fails.

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

Using a command-style call as a value is the most common reason a course does not compile:

```text
feedback, err := Copilot.generateText "Give one sentence of feedback about: " + code   // does not compile
feedback, err := Copilot.generateText("Give one sentence of feedback about: " + code)  // compiles
```

### Top-level code and course start

Top-level statements in `main_course.gox` run once when the program starts. Use them to declare shared state and
register callbacks. After they finish, the course start is delivered to every `onStart` callback, so every callback is
already registered when the opening flow runs.

`onStart` runs once Host capabilities are usable. Put initial API filtering and Ruler configuration before
waiting operations such as presentations or Copilot generation in the same callback, so the initial
configuration is applied before the Playground content is revealed.

Declarations come first. The top-level statements form the body of the course's entry function, and every `func` must be
declared before the first of them. A `func` written after a statement is read as a function literal, and the course does
not compile: `expected '(', found <name>`. Keep `type` declarations at the top as well, so the file reads top-down.

A callback can also register other callbacks. They take effect from the next event. An `onStart` callback registered
after the course has started never runs.

### Execution model

- **One callback runs at a time.** Variables shared between callbacks never race, and course code needs no locks.
- **Waiting calls let other callbacks run.** `showPrelude`, `showMessage`, `showVideo`, `generateText` and
  `generateJSON` wait for the learner or for generation, and `wait` waits for time to pass. While one run waits,
  other runs keep going, including other runs of the same callback, so shared state may have changed by the time the
  call returns.
- **Runs of one callback can overlap.** Every trigger starts a new run of each callback registered for it. A trigger
  that arrives while an earlier run is still waiting starts a second run, and the two interleave at waiting points. How
  overlapping runs should relate, such as dropping the stale one, running one at a time or ignoring triggers while
  busy, is not settled yet ([#3509](https://github.com/goplus/builder/issues/3509)). Until it is, course code handles
  it itself.
- **Different callbacks are independent.** Several callbacks on the same event, including several `onStart` callbacks,
  run independently and may interleave at waiting points. The order in which they start is not promised, so steps that
  must happen in order belong in one callback.
- **Presentations are not serialized.** When runs request `showPrelude`, `showMessage` or `showVideo` at the same time,
  the host decides whether the later call waits for its turn, is rejected, or dismisses the earlier one. Keep a
  sequence of presentations in one callback. Spotlight is not a presentation: `reveal` returns as soon as the highlight
  is shown and can stay on screen together with a dialog.
- **Only the framework's calls yield.** To pause, call `wait seconds`. Anything else that blocks keeps the turn and
  freezes every other callback until it ends: `time.Sleep`, channel operations and `select` (receiving from
  `time.After` or `time.Tick` included), and long-running loops. Waiting for something only another callback can
  provide, such as a value it sends on a channel, never ends. Never start goroutines (`go` statements,
  `time.AfterFunc`): their code runs outside this model, and using the framework from one fails the course.

```go
previous := ""
Editor.Runtime.onLog log => {
	same := log == previous
	previous = log
	if same {
		showMessage "Same output as last time. Try changing something."
	}
}
```

Update shared state before a waiting call. While the dialog is open, the next log starts another run of this
callback, and that run already compares against the new `previous`. Had `previous` been updated after `showMessage`,
the second run would compare against the old value.

```go
onStart => {
	showPrelude "Move Lita to Mushroom."
	showVideo "step-to"
	showMessage "Now try it yourself."
}
```

### Busy events

Every trigger of an event starts a run of each of its callbacks, and a run that reaches a waiting call stays in
flight until the learner or generation answers. A callback that waits on every trigger of a busy event therefore piles
up runs while the event keeps firing, for example an `onLog` callback that opens a dialog for every line the game
prints. Each of those runs requests its own dialog or generation.

Keep waiting calls off the common path of busy events. Return early for triggers that do not matter, so that most
runs finish immediately:

```go
Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	completeWith "Lita reached Mushroom!"
}
```

Events that have not been delivered yet wait in a queue of at most 1024. Runs hand control back whenever they wait, so
a healthy course stays far below that limit. The queue fills only when a run never hands control back, such as a loop
that never reaches a waiting call. Nothing else in the course runs meanwhile, further events are rejected and reported
to the host as errors, and a signal the course waits for may never arrive.

### Completion

`complete` and `completeWith message` end the course:

- No new trigger starts a run, and events still waiting in the queue are dropped.
- The framework lets runs already executing or waiting finish their remaining statements, unless one of their calls
  fails or is cancelled. Do not rely on that in a course, see the last point.
- Only the first `complete` or `completeWith` counts. Later calls do nothing.
- The program then ends. The Playground accepts the completion at once and stops the program right there: a
  presentation or generation still pending is cancelled, and the statements after `complete`, in that run or any
  other, do not get to execute. The course is completed either way, even if the program's own exit is reported as an
  error because a pending call was cancelled. Put the farewell in `completeWith`, not in a `showMessage` after
  `complete`.

`completeWith` shows its message to the learner as feedback. The first course above generates that message from the
learner's code and falls back to a fixed line when generation fails.

## API reference

### Course

| Call | Returns | Notes |
| --- | --- | --- |
| `onStart => { ... }` | | Registers a course-start callback. |
| `showPrelude message` | After the learner dismisses it | Shows the opening task guide. It differs from `showMessage` only in how the host presents it. |
| `showMessage message` | After the learner dismisses it | Shows a dialog. |
| `showVideo name` | After the learner finishes watching | Plays the declared video `name`, not a file path. The host decides what counts as finished. |
| `wait seconds` | After that many seconds | Pauses this callback while other callbacks keep running. Zero or a negative number returns at once. |
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
| `Copilot.onRoundComplete round => { ... }` | | Called when the learner completes a round with Copilot. `round.UserMessage` is the learner's message and `round.ResultMessages` holds the replies. |
| `Copilot.generateText(message)` | The generated text, and an error when generation fails | Waits for generation. |
| `Copilot.generateJSON(message, result)` | An error when generation fails; on success `result` is filled | Waits for generation. |

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
	if err := Copilot.generateJSON(question, review); err != nil {
		showMessage "Run your program again when Lita is ready."
		return
	}
	if review.Correct {
		complete
	} else {
		showMessage review.Suggestion
	}
}
```

#### When generation fails

Generation can fail for reasons the course cannot prevent: the network drops, the learner's sign-in expires, or the
service is out of quota. Instead of stopping the course, `generateText` and `generateJSON` return the failure as an
error, and the course decides what the learner sees next. Plan a fallback for every generation call.

XGo's `?:` gives `generateText` a fallback in one expression:

```go
Editor.Runtime.onLog log => {
	if log == "reached-target" {
		completeWith Copilot.generateText("Praise the learner in one sentence.")?:"Lita made it. Well done!"
	}
}
```

Check the error yourself when the fallback is more than a value:

```go
Editor.Runtime.onExit code => {
	hint, err := Copilot.generateText("Give one hint for this code:\n" + Editor.Project.getCode("Lita"))
	if err != nil {
		hint = "Read your code line by line and compare it with the task."
	}
	showMessage hint
}
```

- A non-nil error means only that this generation produced nothing usable. Branch on `err != nil`, not on the message,
  which is for diagnosis and may change.
- A failed `generateJSON` leaves `result` untouched, including when the response does not fit the struct. Values set
  before the call therefore survive as the fallback.
- Leaving the error unchecked does not stop the course. `Copilot.generateJSON question, review` written as a statement
  drops the error, and the course goes on with whatever `review` held before. Check it unless those values are a fine
  answer by themselves.
- To stop the course instead, write `Copilot.generateText(message)!`. The course then fails as described in
  [When a call fails](#when-a-call-fails), and the learner has to restart it.

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
  [`module_Radar.ts`](../../../../../docs/develop/tutorial-v2/module_Radar.ts). Radar node IDs are generated per session and are
  not valid targets. A selector that matches several visible elements highlights only the first of them in document
  order, so make it specific enough for the element you mean.
- `SpotlightOptions{Mask, Duration}`: `Mask` dims everything except the target. `Duration` hides the highlight after
  that many seconds, and `0` keeps it until the learner clicks anywhere. `reveal` uses `Mask: true, Duration: 0`.
- A malformed selector fails the course. A valid selector that matches nothing at the moment, for example an API hidden
  by `filterAPIs`, is not an error: the highlight is skipped at once, without waiting for the element to appear, and a
  warning is logged. Some elements exist only in some states: the `ruler` toggle is there only after
  `Editor.Ruler.enable`.

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
- `showVideo` names a video the course does not declare.
- A spotlight selector is malformed.
- `generateJSON` receives an unsupported `result`.

This is deliberate. A course that continued after a failed read or a dialog that never appeared could judge the learner
wrongly. Failures of this kind are authoring mistakes and should surface while the course is being tried. Two
exceptions do not stop the course: a well-formed spotlight selector that currently matches nothing, and a failed
Copilot generation, which `generateText` and `generateJSON` return as an error (see
[When generation fails](#when-generation-fails)). Generation fails for reasons outside the course, so a course that
stopped on it would lose the learner's progress for nothing they or the author did.
