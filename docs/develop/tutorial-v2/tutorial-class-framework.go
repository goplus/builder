package tutorial

// Execution model: callbacks run one at a time, so shared variables in Course
// code never race. A callback run yields while it waits on the learner
// (showPrelude, showMessage, showVideo), on generation (generateText,
// generateJSON) or on time (wait); other runs proceed meanwhile.
// Every trigger starts a new run of each callback registered for it, so runs
// of one callback may overlap when a trigger arrives while an earlier run is
// still waiting. Course start is delivered like any other event.
//
// Anything else that blocks holds up every other run until it ends: Go's own
// blocking calls such as time.Sleep, channel operations and select (receiving
// from time.After or time.Tick included), reading or writing an io.Pipe, and
// long-running loops. Waiting for something
// only another callback can provide, such as a value another callback sends
// on a channel, never ends. Course code must not start goroutines of its own
// (go statements, time.AfterFunc): their code runs outside this model, and
// using the framework from one fails the Course program.
//
// TODO(#3509): how overlapping runs of one callback relate (cancelling the
// stale one, running one at a time, ignoring triggers while busy) is not yet
// specified; until it is, Course code handles that race itself. The order in
// which runs start is not promised either.
//
// The framework does not serialize overlapping presentation calls from
// different runs; the host defines how these presentations are handled.

type Course struct {
	CourseAbilities
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight
}

type CourseAbilities interface {
	// onStart registers a callback that is called after Host capabilities are usable.
	// Playground content stays covered until every start callback reaches its first
	// waiting operation or returns. Put initial filterAPIs/Ruler configuration
	// before presentation or Copilot calls to apply it before first display.
	// Several callbacks may be registered; they run independently of each
	// other. Opening steps that must happen in order belong in one callback.
	onStart(callback func())
	// showPrelude presents the Course opening guide with the given message and
	// returns after the learner finishes reading it.
	showPrelude(preludeMessage string)
	// showMessage presents the given message and returns after the learner
	// finishes reading it.
	showMessage(message string)
	// showVideo presents the Course-local video with the given declared resource
	// name and returns after the learner finishes watching it. The host determines
	// how viewing completion is established.
	showVideo(videoName string)
	// wait pauses the calling callback for the given number of seconds; other
	// runs proceed meanwhile. Zero or negative seconds return at once. Pause
	// with wait rather than time.Sleep, which holds up every other run.
	wait(seconds float64)
	// complete marks the course as completed and ends the Course program: no
	// further events start callbacks. Callbacks already running or waiting finish
	// unless a capability fails or is cancelled, and the program then exits.
	// The host settles pending capability calls during shutdown; the Playground
	// Host cancels them and retains the accepted completion result independently
	// of executor exit. Calling complete or completeWith again has no effect.
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
	// onLog registers a callback that is called for every newly appended
	// runtime log: each entry starts one run. Error output is not part of this
	// channel.
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
	// enable turns on the ruler over the stage.
	enable()
	// disable turns off the ruler over the stage.
	disable()
}

type Copilot interface {
	// onRoundComplete registers a callback that is called when a Copilot round
	// completes.
	onRoundComplete(callback func(round CopilotRound))
	// generateText asks Copilot to generate text without adding a conversation round.
	// A failed generation returns an error; see Copilot generation failures below.
	generateText(message string) (string, error)
	// generateJSON derives a JSON Schema from result's struct type and fills result with the generated value.
	// A failed generation returns an error and leaves result untouched; see Copilot generation failures below.
	// result must be a non-nil pointer to a struct; anything else fails the Course program.
	generateJSON(message string, result any) error
}

// Copilot generation failures: generation can fail for reasons outside the
// author's control, such as the network or exhausted service quota, so
// generateText and generateJSON return the failure instead of failing the
// Course program. The Course decides what happens next and keeps the learner's
// session either way:
//
//	completeWith Copilot.generateText("give feedback on: " + code)?:"Well done!"
//
// A non-nil error means only that this generation produced nothing usable; its
// message is for diagnosis and is not a stable contract. A response that does
// not decode into generateJSON's result is a failed generation too. A Course
// that stops with the error (expr!, or panicking with it) fails the Course
// program as any fatal error does. A generateJSON error left unchecked is
// dropped: result keeps its earlier values and the Course carries on.

// CopilotRound is what onRoundComplete receives. Its fields are read as
// written here (round.UserMessage): XGo lowercases method calls, not field
// access.
type CopilotRound struct {
	UserMessage    string
	ResultMessages []string
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
	// target is a Radar selector addressing the UI element to reveal; see the
	// Radar module design for its syntax. When it matches several visible
	// elements, only the first in document order is revealed.
	// A malformed selector fails the Course program, so mistakes surface
	// during Preview. A well-formed selector that currently matches nothing
	// (for example an API filtered out by filterAPIs) is not an error: the
	// host skips the highlight and logs a warning, without waiting for the
	// target to appear.
	reveal(target, tip string)
	// revealWith is reveal with explicit presentation options.
	revealWith(target, tip string, options SpotlightOptions)
}
