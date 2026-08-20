package tutorial

type Course struct {
	CourseAbilities
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight
}

type CourseAbilities interface {
	// onStart registers a callback that is called when the course starts.
	onStart(callback func())
	// showPrelude displays the Course opening guide with the given message and
	// returns after the learner dismisses it. Unlike showMessage, the host
	// presents it as the opening task guide. Presentation never advances
	// automatically.
	showPrelude(preludeMessage string)
	// showMessage displays a dialog with the given message and returns after the
	// learner dismisses it. Presentation never advances automatically: the Course
	// flow always waits for the learner to finish reading.
	showMessage(message string)
	// showVideo displays the Course-local video with the given declared resource
	// name and returns after the learner finishes watching or closes it.
	// Presentation never advances automatically.
	showVideo(videoName string)
	// complete marks the course as completed and ends the Course program: after
	// the current callback returns, no further events are processed and the
	// program exits. Remaining statements in the same callback still run, but
	// presentation calls after a completion are ignored by the host. Calling
	// complete or completeWith again has no effect.
	complete()
	// completeWith is complete with the given feedback displayed to the learner.
	completeWith(message string)
}

type Editor struct {
	Project    Project
	Runtime    Runtime
	CodeEditor CodeEditor
	Ruler      Ruler
}

type Project interface {
	// getCode returns the given sprite's code as it currently stands in the
	// session project. sprite is a sprite name (e.g. "Lita"), matching how the
	// project models its contents; addressing a sprite the project does not
	// contain fails the Course program. This reads the project rather than a
	// Code Editor UI buffer, and reading whichever code the learner happens to
	// be editing is deliberately not offered yet: it depends on how the Code
	// Editor exposes its attached UIs and their active documents.
	getCode(sprite string) string
	// listSprites lists the session project's sprites by name. A Course whose
	// goal is for the learner to create a sprite cannot know the name they
	// will choose, so it discovers it here.
	listSprites() []string
}

type Runtime interface {
	// onStart registers a callback that is called when the project runtime starts.
	onStart(callback func())
	// onExit registers a callback that is called when the project runtime exits.
	onExit(callback func(code int))
	// onLog registers a callback that is called once for every newly appended
	// runtime log, in append order. Error output is not part of this channel.
	onLog(callback func(log string))
}

type CodeEditor interface {
	// filterAPIs limits the APIs available in the Code Editor. Each entry is a
	// definition identifier ("xgo:<package>?<name>#<overloadId>"), the same
	// identifiers the Code Editor uses elsewhere; omitting "#<overloadId>"
	// addresses every overload of the name.
	filterAPIs(apis []string)
	// formatWorkspace formats the current code workspace.
	formatWorkspace()
}

type Ruler interface {
	// show displays the ruler over the stage.
	show()
	// hide removes the ruler from the stage.
	hide()
}

type Copilot interface {
	// onRoundFinish registers a callback that is called when a Copilot round finishes.
	onRoundFinish(callback func(round CopilotRound))
	// generateText asks Copilot to generate text without adding a conversation round.
	generateText(message string) string
	// generateJSON derives a JSON Schema from result's struct type and fills result with the generated value.
	// result must be a non-nil pointer to a struct.
	generateJSON(message string, result any)
}

type CopilotRound struct {
	userMessage    string
	resultMessages []string
}

// SpotlightOptions controls how the spotlight presents a UI target.
type SpotlightOptions struct {
	// Mask dims everything except the revealed target with a translucent
	// overlay that directs the learner's attention.
	Mask bool
	// Duration is the auto-conceal delay in seconds. 0 keeps the spotlight
	// visible until the learner clicks anywhere.
	Duration float64
}

type Spotlight interface {
	// reveal focuses the spotlight on the given UI target and shows the given
	// tip beside it, with Course-guidance defaults: mask enabled and no
	// auto-conceal (the spotlight stays until the learner clicks anywhere).
	// reveal returns once the spotlight is shown; it does not wait for the
	// spotlight to be dismissed, so it never blocks the Course flow.
	// target is a Radar selector addressing the UI elements to reveal; see the
	// Radar module design for its syntax. A selector matching several elements
	// reveals them together as one group.
	// A malformed selector fails the Course program, so mistakes surface
	// during Preview. A well-formed selector that currently matches nothing
	// (for example an API filtered out by filterAPIs) is not an error: the
	// host retries briefly, then skips the highlight and logs a warning.
	reveal(target, tip string)
	// revealWith is reveal with explicit presentation options.
	revealWith(target, tip string, options SpotlightOptions)
}
