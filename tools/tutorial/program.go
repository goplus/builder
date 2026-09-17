package tutorial

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityKind decides what happens during one capability call.
//
// The dividing line is who the call waits for: a call that only waits on the
// host's own computation is bounded and quick, so it may hold the execution
// token throughout; a call that waits on an outside party (the learner, the
// LLM) is unbounded and must release the token so other runs keep going.
// Presentation calls are not serialized by the framework: what happens when
// they overlap is the host capability's own policy (see the contract in
// module_TutorialFramework.ts).
type capabilityKind int

const (
	// kindFast waits only on the host's own computation: called while holding
	// the token, never yielding. Capabilities missing from capabilityKinds get
	// this zero value, so forgetting to register one costs interleaving rather
	// than admitting re-entrancy: the failure mode stays on the safe side.
	kindFast capabilityKind = iota
	// kindWaiting waits on an outside party (the learner or the LLM): the
	// execution token is released for the duration of the call, which is also
	// where a run's cancellation takes effect (see yieldWhile).
	kindWaiting
)

// capabilityKinds records each capability's execution semantics; classify new
// capabilities here. client_contract_test.go checks that every key names a
// capability that actually exists.
var capabilityKinds = map[string]capabilityKind{
	"course_showPrelude":   kindWaiting,
	"course_showMessage":   kindWaiting,
	"course_showVideo":     kindWaiting,
	"copilot_generateText": kindWaiting,
	"copilot_generateJSON": kindWaiting,
}

// errRunEnded is the sentinel meaning "this run stops here": a cancelled run
// uses it at its waiting point, and a run turned away by SkipWhileBusy uses it
// at the join point. runFrame recognizes it and winds down silently without
// recording a fatal error, so the author never sees an error from either.
var errRunEnded = errors.New("tutorial: run ended early")

// courseProgram is everything one Course run owns: the registered callbacks,
// the execution token, the completion and fatal-error flags, and the way to
// call a capability.
//
// Execution model: Course callbacks execute as "runs", and at any instant only
// the holder of the execution token runs Course code. The token's
// release-then-acquire pairs form a happens-before chain, so shared variables
// in Course code never race and the author needs no synchronization at all.
// Every trigger starts a new run of each registered callback; a run releases
// the token while it waits on a waiting capability, so runs of one callback
// may overlap, and how they relate is decided by their run group's policy
// (see runGroup). The order in which runs start is structural: only the
// dispatcher goroutine and Course.Start start runs, through startRuns, in
// registration order within one trigger, each run reaching its first yield or
// its end before the next one starts.
//
// This lives on the Course instance rather than in a package-level singleton,
// and the namespaces share it by pointer. spx does the same: its callbacks
// live in the scriptEventRegistry held by the Game instance.
type courseProgram struct {
	schedulerMu sync.Mutex
	handlers    handlers
	started     bool
	completed   bool
	fatal       any

	// execToken is the execution token: a cap-1 channel used as a binary
	// semaphore, holding one token to start with. Waiters are woken by the
	// runtime; the framework relies on no wake-up order across runs.
	execToken chan struct{}
	// current is the run holding the token. Only read and written while the
	// token is held, hence no lock: runFrame sets it on entry, yieldWhile
	// restores it after reacquiring the token.
	current *run
	// shutdown is closed once, on completion or on a fatal error, to tell the
	// dispatcher goroutine and any queued run to exit.
	shutdown     chan struct{}
	shutdownOnce sync.Once
	// runs counts the in-flight run goroutines plus the dispatcher goroutine;
	// awaitShutdown uses it to wait for them to finish.
	runs sync.WaitGroup

	// callCapability is the bridge to the frontend. It is a field rather than
	// a direct call to xgoexec.CallCapability to leave a seam for tests: the
	// real bridge only exists in js/wasm builds (off-wasm, xgoexec provides a
	// stub that just fails), so unit tests must be able to swap in a fake host.
	callCapability func(name string, request, result any) error
}

// handlers holds every callback the Course program registered, the Course's
// own onStart included: course start is an event that Course.Start delivers
// once, taking the same path as host events rather than a special one.
//
// Each event holds a list of callbacks rather than a single one: onXxx in
// Course code is an ordinary method call, and an author may well write two
// handlers for one event (say one per judging clue), in which case both must
// take effect. spx works the same way: each call to its OnStart and friends
// appends a sink instead of replacing it.
type handlers struct {
	courseStart  []*registration[struct{}]
	runtimeStart []*registration[struct{}]
	runtimeExit  []*registration[int]
	runtimeLog   []*registration[string]
	copilotRound []*registration[CopilotRound]
}

// registration is one registered callback, together with the run group given
// at registration, or nil when none was. A group given here is joined before
// the run's first statement; a group joined by enter() inside the callback
// does not go through here.
type registration[T any] struct {
	handler func(T)
	group   *runGroup
}

// register records one callback. It may be called while the Course runs (from
// inside a callback): the trigger being delivered uses the snapshot it already
// took, so a newly registered callback takes effect from the next trigger on.
func register[T any](p *courseProgram, group *runGroup, handler func(T), attach func(*handlers, *registration[T])) {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	attach(&p.handlers, &registration[T]{handler: handler, group: group})
}

func (p *courseProgram) init() {
	// Fill the token before entering the locked region: no channel operation
	// may happen while schedulerMu is held, one of the invariants that
	// scheduling_invariants_test.go checks mechanically.
	execToken := make(chan struct{}, 1)
	execToken <- struct{}{}

	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	p.handlers = handlers{}
	p.started = true
	p.completed = false
	p.fatal = nil
	p.execToken = execToken
	p.current = nil
	p.shutdown = make(chan struct{})
	p.shutdownOnce = sync.Once{}
	p.callCapability = xgoexec.CallCapability
}

func (p *courseProgram) acquireExec() { <-p.execToken }

// releaseExec returns the execution token. The non-blocking send doubles as a
// runtime assertion: a full slot means something released a token it never
// acquired, which is a framework bug. Failing loudly beats quietly ending up
// with two tokens, which would break mutual exclusion.
func (p *courseProgram) releaseExec() {
	select {
	case p.execToken <- struct{}{}:
	default:
		panic("tutorial: execToken released without a matching acquireExec")
	}
}

// run is one run of a callback: the dispatcher starts one per trigger per
// registered callback, each on its own goroutine.
type run struct {
	// cancelled is set by a run group under CancelPrevious; the run ends once
	// it sees the flag at its next waiting point. cancelCh is closed at the
	// same time, so a run queued under OneAtATime wakes up too.
	cancelled  atomic.Bool
	cancelCh   chan struct{}
	cancelOnce sync.Once
	// yielded is closed when the run first releases the token or ends,
	// whichever comes first; the dispatcher waits on it before starting the
	// next callback, which is spx's JoinYieldedOrDone.
	yielded   chan struct{}
	yieldOnce sync.Once
	// groups are the run groups this run holds, released in turn when it ends.
	// Only read and written while the token is held.
	groups []*runGroup
}

func newRun() *run {
	return &run{cancelCh: make(chan struct{}), yielded: make(chan struct{})}
}

// cancel is called only by a run group, under CancelPrevious.
func (r *run) cancel() {
	r.cancelOnce.Do(func() {
		r.cancelled.Store(true)
		close(r.cancelCh)
	})
}

// markYielded is called only by runFrame (on the run's end) and yieldWhile (on
// the first yield).
func (r *run) markYielded() {
	r.yieldOnce.Do(func() { close(r.yielded) })
}

// runFrame executes one run: acquire the execution token, check admission, run
// the callback, release the groups it holds, release the token.
//
// A panic — a failed capability, or a mistake in the Course code itself — is
// caught here and recorded as a fatal error. Runs execute on their own
// goroutines, so letting a panic through would bypass the main goroutine's
// exit path; recording it lets awaitShutdown re-raise it on the main
// goroutine, and the executor still sees "the Course program panicked, exit
// with an error". errRunEnded is the exception: that is a run ending early by
// policy, and it winds down silently.
//
// Mind the defer order: markYielded is registered first and therefore runs
// last, so the dispatcher is always released when a run ends; releaseExec
// comes next; the closure registered last runs first, which puts releasing the
// groups and clearing current inside the token-holding window, so a failing
// run never carries the token away and freezes the whole Course.
func (p *courseProgram) runFrame(r *run, body func()) {
	defer r.markYielded()
	p.acquireExec()
	defer p.releaseExec()
	// The admission check must come after acquiring the token: a check made
	// before waiting for it may be stale by the time the wait ends, because
	// another run may have completed the Course or recorded a fatal error
	// meanwhile, and this run must then not start at all. A run cancelled
	// before it ever started does not start either: starting is its first
	// waiting point.
	if p.terminated() || r.cancelled.Load() {
		return
	}
	p.current = r
	defer func() {
		recovered := recover()
		for _, g := range r.groups {
			g.release(r)
		}
		p.current = nil
		if recovered != nil && recovered != errRunEnded {
			p.recordFatal(recovered)
		}
	}()
	body()
}

// yieldWhile is a run's only yield point: return the execution token, perform
// wait, then take the token back and restore current. Cancellation takes
// effect here — the flag is checked once before the wait and once after it,
// and either check ends the run with errRunEnded. That is why a cancelled run
// never uses what the wait returned and never fills in the struct the author
// passed: a cancelled run's pending result is discarded.
//
// The token is always returned before the wait, because a waiting call may
// take minutes and holding the token through one would freeze every
// callback.
func (p *courseProgram) yieldWhile(wait func()) {
	r := p.current
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
	if r != nil {
		r.markYielded()
	}
	p.releaseExec()
	func() {
		defer p.acquireExec()
		wait()
	}()
	p.current = r
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
}

// runGroup is a shared policy scope. A run holds the group from the moment it
// joins until the run ends, and the group's policy decides what happens when a
// run joins while another still holds it. One group can be shared by the
// callbacks of different events — the kind of Course where an onLog and an
// onExit both judge completion — which is what an author creates with
// newRunGroup; a policy given directly at registration makes an anonymous
// group private to that callback instead.
//
// groupMu is a leaf lock: its regions only read and write fields, manipulate
// the slice and close a granted channel, with cancelling and waiting left
// outside.
type runGroup struct {
	p      *courseProgram
	policy RunPolicy

	groupMu sync.Mutex
	holder  *run
	waiters []*groupWaiter // runs queued under OneAtATime, in join order
}

type groupWaiter struct {
	r       *run
	granted chan struct{}
}

// Enter implements RunGroup: join the current run to the group. It may only
// be called from inside a Course callback, which is where the token is held.
func (g *runGroup) Enter() {
	g.join(g.p.current)
}

// join handles one join according to the group's policy. The author never has
// to check the outcome of any of the three:
//   - CancelPrevious marks the holder cancelled and this run takes the group
//     over;
//   - SkipWhileBusy ends this run with errRunEnded whenever there is a holder;
//   - OneAtATime queues behind a holder and yields the token until this run's
//     turn comes, or it is cancelled, or the Course ends.
//
// A run already holding the group joining again has no effect.
func (g *runGroup) join(r *run) {
	if r == nil {
		panic("tutorial: RunGroup.enter called outside a course callback")
	}
	switch g.policy {
	case CancelPrevious:
		g.groupMu.Lock()
		holder := g.holder
		g.holder = r
		g.groupMu.Unlock()
		if holder != nil && holder != r {
			holder.cancel()
		}
	case SkipWhileBusy:
		g.groupMu.Lock()
		busy := g.holder != nil && g.holder != r
		if !busy {
			g.holder = r
		}
		g.groupMu.Unlock()
		if busy {
			panic(errRunEnded)
		}
	case OneAtATime:
		g.groupMu.Lock()
		if g.holder == nil || g.holder == r {
			g.holder = r
			g.groupMu.Unlock()
			break
		}
		w := &groupWaiter{r: r, granted: make(chan struct{})}
		g.waiters = append(g.waiters, w)
		g.groupMu.Unlock()
		granted := false
		g.p.yieldWhile(func() {
			select {
			case <-w.granted:
				granted = true
			case <-r.cancelCh:
				g.abandon(w)
			case <-g.p.shutdown:
				g.abandon(w)
			}
		})
		if !granted {
			panic(errRunEnded)
		}
	default:
		return // the zero policy: concurrent, so joining means nothing
	}
	r.hold(g)
}

// hold records a group this run holds, to be released when it ends; joining
// the same group again is recorded only once.
func (r *run) hold(g *runGroup) {
	for _, held := range r.groups {
		if held == g {
			return
		}
	}
	r.groups = append(r.groups, g)
}

// abandon removes from the queue a waiter that is leaving before its turn
// came. It does nothing for a waiter that has just been let through, which
// happens when granted and leaving coincide: that waiter is the holder by now
// and will end and release normally.
func (g *runGroup) abandon(w *groupWaiter) {
	g.groupMu.Lock()
	defer g.groupMu.Unlock()
	for i, waiter := range g.waiters {
		if waiter == w {
			g.waiters = append(g.waiters[:i], g.waiters[i+1:]...)
			return
		}
	}
}

// release frees the group when a run ends: under OneAtATime it hands the
// group to the waiter at the head of the queue and lets it through.
func (g *runGroup) release(r *run) {
	g.groupMu.Lock()
	defer g.groupMu.Unlock()
	if g.holder != r {
		return
	}
	g.holder = nil
	if g.policy == OneAtATime && len(g.waiters) > 0 {
		next := g.waiters[0]
		g.waiters = g.waiters[1:]
		g.holder = next.r
		close(next.granted)
	}
}

// admitRun checks the terminal state and registers a goroutine with runs under
// one lock: after the terminal state, awaitShutdown may already be inside
// Wait, and an Add landing after that is a WaitGroup misuse. A false result
// means no goroutine should start.
func (p *courseProgram) admitRun() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	if p.terminatedLocked() {
		return false
	}
	p.runs.Add(1)
	return true
}

// startRuns starts the runs of every registered callback for one trigger: in
// registration order, each run reaching its first yield or its end (yielded)
// before the next one starts, which is spx's JoinYieldedOrDone. A callback
// given a group at registration joins it before the run's first statement;
// queueing under OneAtATime is itself a yield, so it never holds up the other
// callbacks of the same trigger.
//
// Only the dispatcher goroutine and Course.Start call it, which is what makes
// the start order structural.
func startRuns[T any](p *courseProgram, regs []*registration[T], event T) {
	for _, reg := range regs {
		if !p.admitRun() {
			return
		}
		r := newRun()
		go func() {
			defer p.runs.Done()
			p.runFrame(r, func() {
				if reg.group != nil {
					reg.group.join(r)
				}
				reg.handler(event)
			})
		}()
		select {
		case <-r.yielded:
		case <-p.shutdown:
			return
		}
	}
}

// awaitShutdown waits for the Course to end, by completion or a fatal error.
//
// The completion path waits for every in-flight run to finish on its own: a
// suspended run resumes once the capability it waits on returns (after a
// completion the host no-ops presentation, so that is quick) and executes its
// remaining statements; a queued run sees shutdown and exits; the dispatcher
// goroutine exits. The fatal path does not wait: it re-raises on the main
// goroutine right away, and suspended runs die with the process.
func (p *courseProgram) awaitShutdown() {
	<-p.shutdown
	if fatal := p.fatalValue(); fatal != nil {
		panic(fatal)
	}
	p.runs.Wait()
	// A run finishing on the completion path can still fail — most typically
	// course_complete itself failing, since Complete closes shutdown before
	// calling the capability. Check once more afterwards: a late fatal error
	// must not be swallowed into a "completed" result.
	if fatal := p.fatalValue(); fatal != nil {
		panic(fatal)
	}
}

func (p *courseProgram) beginShutdown() {
	p.shutdownOnce.Do(func() { close(p.shutdown) })
}

func (p *courseProgram) recordFatal(value any) {
	p.schedulerMu.Lock()
	if p.fatal == nil {
		p.fatal = value
	}
	p.schedulerMu.Unlock()
	p.beginShutdown()
}

func (p *courseProgram) fatalValue() any {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.fatal
}

// terminated reports whether the Course reached its terminal state (completed
// or failed), after which no new run should start.
func (p *courseProgram) terminated() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.terminatedLocked()
}

// terminatedLocked is the lock-free half of terminated, so a caller already
// holding schedulerMu can reuse the check inside its own critical section (as
// admitRun does, next to runs.Add).
func (p *courseProgram) terminatedLocked() bool {
	return p.completed || p.fatal != nil
}

// handlerSnapshot returns a snapshot of the registered callbacks.
//
// Snapshotting instead of delivering under the lock avoids deadlocking
// delivery against registration, and it gives "a callback registered while a
// trigger is being delivered" a definite meaning: this trigger uses the
// snapshot, and the new callback takes effect from the next trigger on.
func (p *courseProgram) handlerSnapshot() handlers {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.handlers
}

// markCompleted marks the Course completed and reports whether this was the
// first completion.
//
// Idempotence is required here: the contract lets a Course keep executing the
// statements after complete inside the same callback, and overlapping runs may
// each judge the goal reached. Without this gate the learner would see two
// completion dialogs. The flag is set before the capability call, so even a
// panicking capability cannot reopen the gate.
func (p *courseProgram) markCompleted() bool {
	p.schedulerMu.Lock()
	if p.completed {
		p.schedulerMu.Unlock()
		return false
	}
	p.completed = true
	p.schedulerMu.Unlock()
	p.beginShutdown()
	return true
}

func (p *courseProgram) isCompleted() bool {
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	return p.completed
}

// mustCallCapability performs one capability call with the execution semantics
// registered in capabilityKinds, treating a failure as fatal to the Course
// program.
//
// Why a panic rather than a returned error: the author-facing API has no error
// channel, because the DSL must keep reading like straight-line code, and a
// failure means the presentation or editor operation the Course asked for did
// not happen. Carrying on would judge the learner on a false premise. runFrame
// catches the panic and records it as fatal; it is re-raised on the main
// goroutine, and the executor reports a runtime-stage error.
func (p *courseProgram) mustCallCapability(name string, request, result any) {
	if capabilityKinds[name] == kindFast {
		if err := p.callCapability(name, request, result); err != nil {
			panic(err)
		}
		return
	}

	// While the token is released, a waiting call must not write memory the
	// Course can see: result may be a struct the author shares (generateJSON),
	// and with the token in another run's hands, letting the bridge decode
	// straight into it is a data race. Decode into a private buffer first and
	// fill result in after the token is back. A cancelled run has already
	// ended inside yieldWhile and never reaches the filling step.
	var raw json.RawMessage
	var target any
	if result != nil {
		target = &raw
	}
	var err error
	p.yieldWhile(func() { err = p.callCapability(name, request, target) })
	if err != nil {
		panic(err)
	}
	if result != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, result); err != nil {
			panic(fmt.Errorf("decode capability %q result: %w", name, err))
		}
	}
}
