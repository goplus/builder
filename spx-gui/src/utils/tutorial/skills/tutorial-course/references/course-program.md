# The course program

`main_course.gox` is an XGo program written against the Tutorial Class Framework. The framework's members are
already in scope: the program never imports anything to reach them.

## Naming: methods are lowercase, fields are not

XGo lowercases the first letter of a method call, but not field access. So the namespaces keep their capitals
while the calls on them do not:

```xgo
Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
Copilot.generateText("...")
Spotlight.reveal "Run button", "Click here to run the project"
showMessage "Well done."
```

`Editor`, `Editor.CodeEditor`, `Editor.Project`, `Editor.Runtime`, `Editor.Ruler`, `Copilot` and `Spotlight` are
fields. `showMessage`, `complete` and the rest of the course's own abilities are called with no prefix at all.

## A call with no parentheses is a statement, not an expression

Command-style calls only work as statements. Used as an expression the program does not compile, which is the
single most common mistake in a course program:

```xgo
// Wrong: command style where a value is wanted.
feedback := Copilot.generateText "Give one sentence of feedback about: " + code

// Right: parentheses when the result is used.
feedback := Copilot.generateText("Give one sentence of feedback about: " + code)

// Right: command style as a statement.
completeWith feedback
```

## Execution model

Callbacks run one at a time, so variables shared between them never race. A run yields while it waits on the
learner (`showPrelude`, `showMessage`, `showVideo`) or on generation (`generateText`, `generateJSON`); other
runs proceed meanwhile. Every trigger starts a new run of each callback registered for it, so two runs of one
callback can overlap when a trigger arrives while an earlier run is still waiting. How overlapping runs of one
callback relate is not specified yet (goplus/builder#3509), so a course that can be triggered repeatedly handles
that itself, for example with a flag it sets before the first wait.

Course start is delivered like any other event. `complete` and `completeWith` end the program: no further events
are processed, runs already waiting still finish, and presentation calls made after a completion are ignored.
Calling either one again does nothing.

## The course's own abilities

```xgo
onStart callback         // the course started; several callbacks may be registered
showPrelude message      // the opening task guide; returns after the learner dismisses it
showMessage message      // a dialog; returns after the learner dismisses it
showVideo videoName      // a course video by its declared name; returns when it is finished or closed
complete                 // mark the course complete and end the program
completeWith message     // complete, with a line of feedback for the learner
```

Presentation never advances on its own: each of these waits for the learner.

## Editor

```xgo
Editor.Project.getCode(sprite)     // the sprite's code as it stands now; an unknown sprite fails the program
Editor.Project.listSprites()       // the sprites of the session project, by name
Editor.Runtime.onStart callback    // the project runtime started
Editor.Runtime.onExit callback     // the project runtime exited; the callback receives the exit code
Editor.Runtime.onLog callback      // one run per newly appended runtime log line; error output is not included
Editor.CodeEditor.filterAPIs apis  // limit the APIs the Code Editor offers
Editor.CodeEditor.formatWorkspace  // format the current workspace
Editor.Ruler.show / hide           // the ruler over the stage
```

`filterAPIs` takes definition identifiers of the form `xgo:<package>?<name>#<overloadId>`; leaving out
`#<overloadId>` addresses every overload of that name.

`onLog` is how a course usually knows the learner succeeded: the embedded project prints a marker, and the
course recognises it.

```xgo
Editor.Runtime.onLog log => {
	if log == "reached-target" {
		code := Editor.Project.getCode("Lita")
		completeWith Copilot.generateText("Give one short sentence of praise for this solution:\n" + code)
	}
}
```

## Copilot

```xgo
Copilot.onRoundFinish callback          // a Copilot round finished; the callback receives the round
Copilot.generateText(message) string    // generate text without adding a conversation round
Copilot.generateJSON(message, result)   // fill result from generated JSON
```

`generateJSON` derives a JSON Schema from the struct `result` points at, so `result` must be a non-nil pointer
to a struct **with exported fields**. A struct whose fields are all lowercase derives an empty schema and is
rejected.

```xgo
type Review struct {
	Score   int
	Comment string
}

review := &Review{}
Copilot.generateJSON("Rate this solution from 1 to 5:\n" + code, review)
if review.Score > 3 {
	completeWith review.Comment
}
```

A round's fields are read as written, because XGo lowercases calls and not field access:
`round.UserMessage`, `round.ResultMessages`.

## Spotlight

```xgo
Spotlight.reveal target, tip                      // highlight a UI target with a tip beside it
Spotlight.revealWith target, tip, options         // the same, with explicit SpotlightOptions{Mask, Duration}
```

`reveal` returns as soon as the spotlight is shown, so it never blocks the course. Its defaults are course
guidance: the mask is on and the spotlight stays until the learner clicks anywhere. `target` is a Radar selector
naming the UI elements to reveal; one selector may match several elements, which are then revealed together. A
malformed selector fails the course program, so mistakes show up in Preview; a well-formed selector that matches
nothing right now is not an error, the host retries briefly and then skips the highlight.

## A complete example

```xgo
onStart => {
	Editor.CodeEditor.filterAPIs ["xgo:github.com/goplus/spx/v3?Sprite.stepTo"]
	showPrelude "Move Lita to Mushroom. Click Mushroom's name to insert it into your code."
	showVideo "step-to"
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
