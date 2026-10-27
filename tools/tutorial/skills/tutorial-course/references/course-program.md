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

// Only the latest "reached-target" matters: a newer signal cancels a
// judgement that is still waiting on Copilot.
judging := newRunGroup(CancelPrevious)

Editor.Runtime.onLog log => {
	if log != "reached-target" {
		return
	}
	judging.start => {
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
list. Then it waits. The learner's project prints `reached-target` when Lita touches Mushroom (`print "reached-target"`
in `Mushroom.spx`), and the `onLog` callback turns that signal into a completion with generated feedback, or with a
fixed line when generation fails. `print` adds nothing to the text, so the callback compares the log as it is. A signal
printed with `println` ends with a line break and has to be matched differently; see [Editor.Runtime](#editorruntime).
The judgement runs inside `judging.start`, a [run group](#run-groups) with `CancelPrevious`: should the signal arrive
again while Copilot is still judging the previous one, the earlier judgement is cancelled and only the latest counts.

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
Imports of standard packages, such as `import "strings"`, go before everything else.

A callback can also register other callbacks. They take effect from the next event. An `onStart` callback registered
after the course has started never runs.

### Execution model

- **One callback runs at a time.** Variables shared between callbacks never race, and course code needs no locks.
- **Waiting calls let other callbacks run.** `showPrelude`, `showMessage`, `showVideo`, `generateText` and
  `generateJSON` wait for the learner or for generation, and `wait` waits for time to pass. While one run waits,
  other runs keep going, including other runs of the same callback, so shared state may have changed by the time the
  call returns.
- **Runs may overlap.** Every trigger starts a new run of each callback registered for it. A trigger that arrives while
  an earlier run is still waiting starts a second run, and the two interleave at waiting points. Runs are independent
  unless a [run group](#run-groups) relates them.
- **Starts are ordered.** Triggers are handled in arrival order. Within one trigger, the callbacks start in registration
  order, each running to its first wait or its end before the next starts, and proceed independently from there,
  several `onStart` callbacks included. A run started with `start` begins when the starting run next waits or ends.
  Steps that must happen in order belong in one callback.
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
		completeWith Copilot.generateText("Give one short sentence of feedback about this solution:\n" + code)?:"Well done!"
	}
}
```

`start` does not wait for the run it starts. The new run begins when the calling run next waits or ends, and the
statements after `start` are not part of it: they still belong to the calling run, and the two interleave at waiting
points like any other runs. Everything the policy must protect goes inside the braces. Create groups at the top level: a
group created inside a callback is new for every run and relates nothing.

Put the group where the work is, not around the whole callback. Registration takes a plain callback; the callback
filters its triggers first and calls `start` only for the ones that matter. Had the whole `onLog` callback above been
one run of the group, every line the project prints would be a run of it, and every unrelated print would cancel a
judgement in progress. A callback with nothing to filter, such as `onExit`, simply calls `start` as its only statement.

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
	if err := Copilot.generateJSON(prompt, verdict); err != nil {
		showMessage "Copilot could not judge this attempt. Run the project again to try once more."
		return
	}
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

Editor.Runtime.onExit code => {
	judging.start => {
		judge("stopped the project")
	}
}

Copilot.onRoundComplete round => {
	judging.start => {
		judge("asked Copilot about: " + round.UserMessage)
	}
}
```

A learner who runs the project, gets `reached-target` and stops it while Copilot is still judging sees one verdict: the
exit cancels the judgement the log started. The
[run-groups example](../../../../../docs/develop/tutorial-v2/example-tutorial-course-run-groups/) is a complete course
built this way, with hints queued through a second group.

#### What cancellation does

Cancellation takes effect at waiting points and is quiet. A cancelled run ends at its next waiting call: if it is
waiting, the call's result is discarded when the host settles it, so a `generateJSON` struct is never filled; otherwise
it ends before making its next waiting call. Statements between two waits still run. The host is not told: a dialog the
cancelled run has opened is not withdrawn, and the learner still closes it. Cancellation is not an error, and the course
goes on.

#### Hints one at a time

```go
hints := newRunGroup(OneAtATime)
attempts := 0

Editor.Runtime.onExit code => {
	attempts++
	if attempts < 3 {
		return
	}
	hints.start => {
		showMessage "Hint: stepTo takes a sprite name, like stepTo Mushroom."
	}
}
```

Three quick stops show one hint after another instead of three dialogs at once. A run waiting its turn costs nothing and
holds nothing else up; it begins when the previous run ends, after the earlier hint was dismissed. Counting the stops
stays outside the group, so every stop counts the moment it happens, and only the dialog is queued. After `complete`,
runs still waiting their turn never begin.

#### Rules

- A run of a group must not start a run of the same group. Under `CancelPrevious` it would cancel itself, under the
  other two policies the new run could never begin. The framework reports it as an error and the course fails.
- A callback on a frequent event never waits outside a group. Filter first, then `start`.
- Shared state a run updates should be updated before its first waiting call, because other runs go on while it waits.

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

Let a group with `SkipWhileBusy` absorb a signal that repeats while a condition holds:

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
| `newRunGroup(policy)` | A run group | `policy` is `CancelPrevious`, `OneAtATime` or `SkipWhileBusy`. See [Run groups](#run-groups). |

Presentations never advance on their own.

### RunGroup

| Call | Returns | Notes |
| --- | --- | --- |
| `group.start => { ... }` | Immediately | Starts a run of the group executing the body. The run begins when the calling run next waits or ends; the group's policy decides what happens if another run holds the group. |

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
| `Editor.Runtime.onLog log => { ... }` | The learner's project prints a log line, once per line and in output order. `log` is the line as printed, including the line break `println` ends it with. Runtime errors are not part of this channel. This is the main way to detect what the learner achieved. |

Neither the console nor a dialog shows the line break `println` ends a log with, so comparing a `println` signal
with its bare text looks right and never matches. If the project prints `println "reached-target"`, the log is
`"reached-target\n"`, and this course never completes:

```go
Editor.Runtime.onLog log => {
	if log == "reached-target" { // never true for a println signal
		complete
	}
}
```

Match a signal according to how the project prints it:

| The project prints | The course matches |
| --- | --- |
| `print "reached-target"`, which adds nothing to the text | `log == "reached-target"` |
| `println "reached-target"`, which ends it with a line break | `log == "reached-target\n"` |
| a signal with a varying part, such as `print "picked up " + name` | `strings.HasPrefix(log, "picked up")` or `strings.Contains` |

`print` adds no space next to a string, so `print "picked up", name` prints `picked upMushroom`; join the parts
yourself. `strings.HasPrefix` and `strings.Contains` need `import "strings"` at the top of `main_course.gox`:

```go
import "strings"

Editor.Runtime.onLog log => {
	if log == "reached-target\n" { // printed with println
		completeWith "Lita reached Mushroom!"
	}
	if strings.HasPrefix(log, "picked up") {
		showMessage "Now bring it home."
	}
}
```

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
  arrays of supported types. Maps, interfaces, channels, recursive types, embedded fields without a `json` name or
  with an unexported type, and types with their own `UnmarshalJSON` or `UnmarshalText` are rejected.

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
