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
	// showVideo displays the video at the given course-local path and returns
	// after the learner finishes watching or closes it. Presentation never
	// advances automatically.
	showVideo(videoPath string)
	// complete marks the course as completed.
	complete()
	// completeWith marks the course as completed and displays the given feedback.
	completeWith(message string)
}

type Editor struct {
	project    Project
	runtime    Runtime
	codeEditor CodeEditor
	ruler      Ruler
}

type Project struct{}

type Runtime interface {
	// onStart registers a callback that is called when the project runtime starts.
	onStart(callback func())
	// onExit registers a callback that is called when the project runtime exits.
	onExit(callback func(code int))
	// onLog registers a callback that is called when the project runtime emits a log.
	onLog(callback func(log string))
}

type CodeEditor interface {
	// filterAPIs limits the APIs available in the Code Editor.
	filterAPIs(apis []string)
	// formatWorkspace formats the current code workspace.
	formatWorkspace()
	// getCode returns the learner's current code.
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
	// Spotlight presentation never blocks the Course flow.
	// target is a stable UI-target ID owned and published by the SPX Project
	// Editor; session-local Radar node IDs are not valid targets.
	reveal(target, tip string)
	// revealWith is reveal with explicit presentation options.
	revealWith(target, tip string, options SpotlightOptions)
}
