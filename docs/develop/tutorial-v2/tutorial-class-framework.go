package tutorial

type Course struct {
	CourseAbilities
	editor    Editor
	copilot   Copilot
	spotlight Spotlight
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
	project    Project
	runtime    Runtime
	codeEditor CodeEditor
	ruler      Ruler
}

type Project interface {
	// getCode returns the current content of the given code file in the session
	// project model, regardless of what the Code Editor UI shows. file is a path
	// relative to the project root (e.g. "Lita.spx"); addressing a file that
	// does not exist fails the Course program.
	getCode(file string) string
	// listCodeFiles lists the code files of the session project model, e.g.
	// "main.spx" and the sprite code files. Assets are not included.
	listCodeFiles() []string
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
	// filterAPIs limits the APIs available in the Code Editor. Each entry is
	// an API identifier: the author shorthand "name" / "name#overloadId"
	// resolved in the Course project's API context, or a full definition
	// identifier ("xgo:<package>?<name>#<overloadId>"). An identifier without
	// "#overloadId" addresses all overloads of the name.
	filterAPIs(apis []string)
	// formatWorkspace formats the current code workspace.
	formatWorkspace()
	// getCode returns the code text of the currently attached Code Editor UI,
	// or an empty string when none is attached. For reading a specific file of
	// the session project regardless of the UI state, use editor.project.getCode.
	getCode() string
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
	// target is a stable UI-target ID owned and published by the SPX Project
	// Editor (append-only). IDs are either static (initially runButton,
	// stopButton, rerunButton, formatButton, codeEditor, stage, apiReference
	// and copilotEntry) or parameterized: "apiReference.<apiId>" addresses
	// entries of the API Reference panel, where <apiId> uses the same API
	// identifiers as editor.codeEditor.filterAPIs; an <apiId> without
	// "#overloadId" highlights all overloads of the name together as one
	// group. Session-local Radar node IDs are not valid targets.
	// An unknown ID fails the Course program, so typos surface during
	// Preview. A known ID whose elements cannot currently be resolved (for
	// example an API filtered out by filterAPIs) is not an error: the host
	// retries briefly, then skips the highlight and logs a warning.
	reveal(target, tip string)
	// revealWith is reveal with explicit presentation options.
	revealWith(target, tip string, options SpotlightOptions)
}
