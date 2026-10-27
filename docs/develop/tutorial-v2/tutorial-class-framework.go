package tutorial

// Execution model: callbacks run one at a time, so shared variables in Course
// code never race. A callback run yields while it waits on the learner
// (showPrelude, showMessage, showVideo), on generation (generateText,
// generateJSON) or on time (wait); other runs proceed meanwhile.
// Every trigger starts a new run of each callback registered for it, so runs
// of one callback may overlap when a trigger arrives while an earlier run is
// still waiting. A RunGroup whose runs the callbacks start decides how such
// runs relate; without one they run independently. Runs start in a fixed
// order: triggers are handled in arrival order, and within one trigger the
// callbacks start in registration order, each running to its first wait or
// its end before the next starts; a run started with RunGroup.start begins
// once the starting run next waits or ends (a run waiting its turn under
// OneAtATime holds nothing up). Course start is delivered like any other
// event.
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
// The framework does not serialize overlapping presentation calls from
// different runs; the host defines how these presentations are handled.

// RunPolicy decides how the runs of one run group relate: what happens when a
// run of the group is started while an earlier run still holds the group.
// Create a RunGroup with newRunGroup and start runs of it where the work that
// must not overlap is, after the callback filters its triggers; several
// callbacks may share one group.
type RunPolicy int

const (
	// CancelPrevious cancels the run holding the group so the new run takes
	// its place. A cancelled run ends at its next waiting point: if it is
	// waiting, the result of that call is discarded when the host settles it;
	// otherwise it ends before making its next waiting call. Statements
	// between waits still run, and the host may still finish presenting what
	// it was asked. Use it when only the latest trigger matters, such as
	// judging the latest output.
	CancelPrevious RunPolicy = iota + 1
	// OneAtATime lets runs through one after another in start order: a run
	// started while another holds the group waits its turn, holding nothing
	// else up, and begins once that run ends. Use it when every trigger must
	// be handled in full and in order, such as showing a hint for each failed
	// run.
	OneAtATime
	// SkipWhileBusy does not start the run at all while another run holds the
	// group. Use it to react once to a burst of triggers, such as judging once
	// while a signal repeats every frame.
	SkipWhileBusy
)

// RunGroup is a shared policy scope for runs. It holds at most one run at a
// time, and its RunPolicy decides what happens when a run of it is started
// while another still holds it, whichever callback started either run. One
// group may therefore be shared by callbacks of different events, for example
// an onLog and an onExit that both judge completion:
//
//	judging := newRunGroup(CancelPrevious)
//	Editor.Runtime.onLog log => {
//		if log != "reached" { return }
//		judging.start => { judge() } // start here, after the filter
//	}
//	Editor.Runtime.onExit code => {
//		judging.start => { judge() }
//	}
type RunGroup interface {
	// start starts a new run of the group executing body. The calling run
	// does not wait for it: the new run begins once the caller next waits or
	// ends, and the group's policy decides what happens if another run still
	// holds the group. Starting a run of the group from a run of the same
	// group is an error.
	start(body func())
}

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
	// Several callbacks may be registered: they start in registration order,
	// each running to its first wait before the next starts, then proceed
	// independently. Opening steps that must happen in order belong in one
	// callback.
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
	// newRunGroup creates a run group with the given policy; see RunGroup.
	newRunGroup(policy RunPolicy) RunGroup
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
	// runtime log: each entry starts one run, and runs start in append order.
	// Error output is not part of this channel. log is the entry as printed,
	// so one printed by println ends with a line break.
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
	// A failed generation (network, quota) returns an error instead of failing the Course program.
	generateText(message string) (string, error)
	// generateJSON derives a JSON Schema from result's struct type and fills result with the generated value.
	// A failed generation returns an error and leaves result untouched.
	// result must be a non-nil pointer to a struct; anything else fails the Course program.
	generateJSON(message string, result any) error
}

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
