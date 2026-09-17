package tutorial

// RunPolicy decides how runs sharing a run group relate: what happens when a
// run joins while another still holds the group. A policy given directly at
// registration (`onExit OneAtATime, code => {...}`) puts every run of that
// callback in a private group from its first statement. When a callback
// filters its triggers, or when several callbacks must share one policy,
// create a group with newRunGroup and enter() it where it matters. The zero
// value means no policy: runs are independent and may overlap.
type RunPolicy int

const (
	// CancelPrevious cancels the run holding the group so the joining run
	// proceeds. A cancelled run ends at its next waiting point: if it is
	// waiting, the result is discarded when the host settles the call;
	// otherwise it ends before making its next waiting call. Statements
	// between waits still run, and the host may still finish presenting what
	// it was asked. Use it when only the latest trigger matters.
	CancelPrevious RunPolicy = iota + 1
	// OneAtATime lets runs through one after another in join order: a joining
	// run yields the token and queues until the run holding the group ends.
	// Use it when every trigger must be handled in full and in order, such as
	// showing one hint per failed run.
	OneAtATime
	// SkipWhileBusy ends the joining run on the spot while another run holds
	// the group, so the statements after the join point do not execute. Use it
	// to react once to a burst of triggers, such as judging once while a
	// signal repeats every frame.
	SkipWhileBusy
)

// RunGroup is a shared policy scope for runs, see RunPolicy. An author creates
// one with Course.newRunGroup and joins it with enter() inside a callback, or
// passes it as the first argument at registration.
type RunGroup interface {
	// Enter joins the current run to the group. The author never has to check
	// a result: under SkipWhileBusy the run may end here, under OneAtATime it
	// may wait here, and under CancelPrevious the run holding the group is
	// cancelled. A run already holding the group joining again has no effect.
	Enter()
}
