package tutorial

// RunPolicy decides how the runs of one run group relate: what happens to a
// run of the group started while another still holds the group. An author
// creates a group with newRunGroup and runs the work that must not overlap
// inside it, typically after filtering the trigger; one group may be shared
// by the callbacks of several events. The zero value means no policy: runs
// are independent and may overlap.
type RunPolicy int

const (
	// CancelPreviousPolicy cancels the run holding the group so the new run
	// takes its place. A cancelled run ends at its next waiting point: if it is
	// waiting, the result is discarded when the host settles the call;
	// otherwise it ends before making its next waiting call. Statements
	// between waits still run, and the host may still finish presenting what
	// it was asked. Use it when only the latest trigger matters.
	CancelPreviousPolicy RunPolicy = iota + 1
	// QueuePolicy lets runs through one after another in start order: a run
	// started while another holds the group waits its turn and begins once
	// that run ends. Use it when every trigger must be handled in full and in
	// order, such as showing one hint per failed run.
	QueuePolicy
	// SkipPolicy does not start the run at all while another run holds the
	// group. Use it to react once to a burst of triggers, such as judging once
	// while a signal repeats every frame.
	SkipPolicy
)

// RunGroup is a shared policy scope for runs, see RunPolicy. It holds at most
// one run at a time. An author creates one with newRunGroup and runs work in
// it from inside callbacks.
type RunGroup interface {
	// Run starts a new run of the group executing body and waits until it
	// ends. Course code spells it `judging.run => { ... }`. The group's policy
	// decides what happens when another run still holds the group; under
	// SkipPolicy the body may not run at all. The statements after the call
	// execute once the run has ended, cancelled or not, and see what the body
	// assigned. Other callbacks proceed while the caller waits.
	//
	// Running the group from a run of the same group is an error.
	Run(body func())
}
