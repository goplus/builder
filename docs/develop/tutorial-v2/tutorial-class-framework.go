package tutorial

// Execution model: callbacks run one at a time, so shared variables in Course
// code never race. A callback run yields while it waits on the learner
// (showPrelude, showMessage, showVideo) or on generation (generateText,
// generateJSON); other runs proceed meanwhile. Every trigger starts a new run
// of each callback registered for it, so runs of one callback may overlap
// when a trigger arrives while an earlier run is still waiting. A RunPolicy
// given at registration, or a RunGroup the run joins, decides how such runs
// relate; without either they run independently. Runs start in a fixed
// order: triggers are handled in arrival order, and within one trigger the
// callbacks start in registration order, each running to its first wait or
// its end before the next starts (a run held back by OneAtATime does not
// delay the others). Course start is delivered like any other event.
//
// Overlapping presentation calls from different runs are the host's business:
// the framework does not serialize them, and the host's capability decides
// whether to queue the later call, reject it, or dismiss the earlier one.

// RunPolicy decides how runs that share a run group relate when a run joins
// the group while an earlier run still holds it. A policy given directly at
// registration (`onExit OneAtATime, code => {...}`) puts every run of that
// callback in a private group from its first statement. When a callback
// filters its triggers, or when several callbacks must share one policy,
// create a RunGroup and join it where it matters.
type RunPolicy int

const (
	// CancelPrevious cancels the run holding the group so the joining run
	// proceeds. A cancelled run ends at its next waiting point: if it is
	// waiting, the result of that call is discarded when the host settles it;
	// otherwise it ends before making its next waiting call. Statements
	// between waits still run, and the host may still finish presenting what
	// it was asked. Use it when only the latest trigger matters, such as
	// judging the latest output.
	CancelPrevious RunPolicy = iota + 1
	// OneAtATime lets runs through one after another in arrival order: a
	// joining run waits, yielding like a waiting call, until the run holding
	// the group ends. Use it when every trigger must be handled in full and in
	// order, such as showing a hint for each failed run.
	OneAtATime
	// SkipWhileBusy ends the joining run on the spot while another run holds
	// the group; the statements after the join point do not execute. Use it
	// to react once to a burst of triggers, such as judging once while a
	// signal repeats every frame.
	SkipWhileBusy
)

// RunGroup is a shared policy scope for runs. A run holds the group from the
// moment it joins until the run ends; the group's RunPolicy decides what
// happens when a run joins while another still holds it. One group may be
// shared by callbacks of different events, for example an onLog and an
// onExit that both judge completion:
//
//	judging := newRunGroup(SkipWhileBusy)
//	Editor.Runtime.onLog log => {
//		if log != "reached" { return }
//		judging.enter() // join here, after the filter
//		...
//	}
//	Editor.Runtime.onExit code => {
//		judging.enter()
//		...
//	}
type RunGroup interface {
	// enter joins the current run to the group at this point. It never needs
	// a checked result: under SkipWhileBusy the run may end here, under
	// OneAtATime it may wait here, under CancelPrevious the run holding the
	// group is cancelled. Joining a group the run already holds has no effect.
	enter()
}

type Course struct {
	CourseAbilities
	Editor    Editor
	Copilot   Copilot
	Spotlight Spotlight
}

type CourseAbilities interface {
	// onStart registers a callback that is called when the course starts.
	// Several callbacks may be registered: they start in registration order,
	// each running to its first wait before the next starts, then proceed
	// independently. Opening steps that must happen in order belong in one
	// callback.
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
	// complete marks the course as completed and ends the Course program: no
	// further events are processed, callbacks already running or waiting still
	// run to their end (presentation calls after a completion are ignored by
	// the host), and the program then exits. Calling complete or completeWith
	// again has no effect.
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

// Every event registration below accepts an optional RunPolicy or RunGroup
// before the callback (`onExit OneAtATime, code => {...}`,
// `onLog judging, log => {...}`); it applies from the run's first statement.
// A callback that filters its triggers should join a RunGroup after the
// filter instead. See RunPolicy and RunGroup.
type Runtime interface {
	// onStart registers a callback that is called when the project runtime starts.
	onStart(callback func())
	// onExit registers a callback that is called when the project runtime exits.
	onExit(callback func(code int))
	// onLog registers a callback that is called for every newly appended
	// runtime log: each entry starts one run, and runs start in append order.
	// Error output is not part of this channel.
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
	// onRoundFinish registers a callback that is called when a Copilot round
	// finishes. An optional RunPolicy or RunGroup may precede the callback;
	// see RunPolicy and RunGroup.
	onRoundFinish(callback func(round CopilotRound))
	// generateText asks Copilot to generate text without adding a conversation round.
	generateText(message string) string
	// generateJSON derives a JSON Schema from result's struct type and fills result with the generated value.
	// result must be a non-nil pointer to a struct.
	generateJSON(message string, result any)
}

// CopilotRound is what onRoundFinish receives. Its fields are read as
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
