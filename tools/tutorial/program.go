package tutorial

import (
	"encoding/json"
	"errors"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"github.com/goplus/builder/tools/xgoexec"
	"github.com/visualfc/gid"
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

// errRunEnded is the sentinel meaning "this run stops here": a run cancelled
// by its group under CancelPrevious uses it at its waiting point. runFrame
// recognizes it and winds down silently without recording a fatal error, so
// the author never sees an error from it.
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
// the token while it waits on a waiting capability or pauses with wait, so runs
// of one callback may overlap, and the only thing that relates runs is a run
// group's policy (see runGroup). The order in which runs begin is structural:
// runs begin only through startRun, from startRuns (the dispatcher goroutine
// and Course.Start, in registration order within one trigger) and from
// startChildren (the runs a run started with RunGroup.start, in start order,
// when that run yields or ends), each run reaching its first yield or its end
// before the next one begins.
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
	// holder is the ID of the goroutine holding the token, 0 while the token
	// is free. Unlike current it is read by goroutines that do not hold the
	// token, to tell whether they do (see holding), hence atomic.
	holder atomic.Uint64
	// shutdown is closed once, on completion or on a fatal error, to tell the
	// dispatcher goroutine and anything waiting for a run to exit.
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

// registration is one registered callback.
type registration[T any] struct {
	handler func(T)
}

// register records one callback. It may be called while the Course runs (from
// inside a callback): the trigger being delivered uses the snapshot it already
// took, so a newly registered callback takes effect from the next trigger on.
func register[T any](p *courseProgram, handler func(T), attach func(*handlers, *registration[T])) {
	p.requireRun("registering a callback")
	p.schedulerMu.Lock()
	defer p.schedulerMu.Unlock()
	attach(&p.handlers, &registration[T]{handler: handler})
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
	p.holder.Store(0)
	p.shutdown = make(chan struct{})
	p.shutdownOnce = sync.Once{}
	p.callCapability = xgoexec.CallCapability
}

func (p *courseProgram) acquireExec() {
	<-p.execToken
	p.holder.Store(gid.Get())
}

// releaseExec returns the execution token. The non-blocking send doubles as a
// runtime assertion: a full slot means something released a token it never
// acquired, which is a framework bug. Failing loudly beats quietly ending up
// with two tokens, which would break mutual exclusion.
func (p *courseProgram) releaseExec() {
	p.holder.Store(0)
	select {
	case p.execToken <- struct{}{}:
	default:
		panic("tutorial: execToken released without a matching acquireExec")
	}
}

// run is one run of Course code: a callback run, which the dispatcher starts
// per trigger per registered callback, or a run of a run group, started with
// RunGroup.start. Each executes on its own goroutine.
type run struct {
	// body is the Course code this run executes.
	body func()
	// group is the run group this is a run of, nil for a callback run. A group
	// run holds its group from the moment start admitted it until it ends.
	group *runGroup
	// children are the runs this run started with RunGroup.start that have
	// not begun yet: they begin, in start order, when this run next yields or
	// ends (see startChildren). Only touched on this run's own goroutine, the
	// only goroutine that ever executes its code.
	children []*run

	// cancelled is set by a run group under CancelPrevious: the run ends once
	// it sees the flag at its next waiting point, and never begins if it has
	// not begun yet.
	cancelled atomic.Bool
	// yielded is closed when the run first releases the token or ends,
	// whichever comes first; whoever started the run waits on it before
	// starting the next one, which is spx's JoinYieldedOrDone.
	yielded   chan struct{}
	yieldOnce sync.Once
}

func newRun(body func()) *run {
	return &run{body: body, yielded: make(chan struct{})}
}

// cancel is called only by a run group, under CancelPrevious.
func (r *run) cancel() { r.cancelled.Store(true) }

// markYielded is called only by runFrame (on the run's end) and yieldWhile (on
// the first yield).
func (r *run) markYielded() {
	r.yieldOnce.Do(func() { close(r.yielded) })
}

// runFrame executes one run: acquire the execution token, check admission, run
// the body, release the group it holds, release the token, then start the
// runs it started.
//
// A panic — a failed capability, or a mistake in the Course code itself — is
// caught here and recorded as a fatal error. Runs execute on their own
// goroutines, so letting a panic through would bypass the main goroutine's
// exit path; recording it lets awaitShutdown re-raise it on the main
// goroutine, and the executor still sees "the Course program panicked, exit
// with an error". errRunEnded is the exception: that is a run ending early by
// policy, and it winds down silently.
// TODO: Distinguish expected capability cancellation from execution errors.
//
// Mind the defer order: markYielded is registered first and therefore runs
// last, so whoever waits for this run is always released when it ends;
// startChildren comes next, so the runs this run started begin after the
// token is back in circulation and before this run counts as yielded, which
// is what keeps the beginning order structural; releaseExec after that; the
// closure registered last runs first, which puts releasing the group and
// clearing current inside the token-holding window, so a failing run never
// carries the token away and freezes the whole Course.
func (p *courseProgram) runFrame(r *run) {
	defer r.markYielded()
	p.acquireExec()
	defer p.startChildren(r)
	defer p.releaseExec()
	// The admission check must come after acquiring the token: a check made
	// before waiting for it may be stale by the time the wait ends, because
	// another run may have completed the Course or recorded a fatal error
	// meanwhile, and this run must then not begin at all. A run cancelled
	// before it ever began does not begin either: beginning is its first
	// waiting point.
	if p.terminated() || r.cancelled.Load() {
		return
	}
	p.current = r
	defer func() {
		recovered := recover()
		if r.group != nil {
			// Under OneAtATime the group hands over to the next queued run,
			// which this run starts as its last child.
			if next := r.group.release(r); next != nil {
				r.children = append(r.children, next)
			}
		}
		p.current = nil
		if recovered != nil && recovered != errRunEnded {
			p.recordFatal(recovered)
		}
	}()
	r.body()
}

// yieldWhile is a run's only yield point: return the execution token, start
// the runs this run started, perform wait, then take the token back and
// restore current. Cancellation takes effect here — the flag is checked once
// before the wait and once after it, and either check ends the run with
// errRunEnded. That is why a cancelled run never uses what the wait returned
// and never fills in the struct the author passed: a cancelled run's pending
// result is discarded.
//
// The token is always returned before the wait, because a waiting call may
// take minutes and holding the token through one would freeze every
// callback.
func (p *courseProgram) yieldWhile(wait func()) {
	r := p.current
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
	p.releaseExec()
	if r != nil {
		p.startChildren(r)
		r.markYielded()
	}
	func() {
		defer p.acquireExec()
		wait()
	}()
	p.current = r
	if r != nil && r.cancelled.Load() {
		panic(errRunEnded)
	}
}

// holding reports whether the calling goroutine holds the execution token.
//
// Course code runs on run goroutines, only while they hold the token, unless
// it starts goroutines of its own (a go statement, time.AfterFunc): code on
// those runs outside the scheduler, and this is how the framework tells.
func (p *courseProgram) holding() bool {
	return p.holder.Load() == gid.Get()
}

// requireRun fails the Course when the calling goroutine does not hold the
// execution token, that is, when Course code uses the framework from a
// goroutine it started itself; what describes that use for the error message,
// such as "calling wait". Every entry point Course code can reach calls it
// first.
//
// Letting such a call through would break the scheduler: a waiting call would
// release a token the goroutine never acquired, panicking when the token is
// free and handing out a second token when a run holds it. There is no run
// frame to catch a panic on that goroutine, so record the error as fatal, which
// ends the Course the usual way, and end the goroutine.
func (p *courseProgram) requireRun(what string) {
	if p.holding() {
		return
	}
	p.recordFatal(fmt.Errorf("%s from a goroutine the Course started: the framework may only be used at the top level of the Course and in its callbacks", what))
	runtime.Goexit()
}

// pause suspends the calling run for d and lets other runs proceed meanwhile,
// which makes it a waiting point like a waiting capability. The caller must
// hold the token. A non-positive d returns at once without yielding, as
// time.Sleep does.
func (p *courseProgram) pause(d time.Duration) {
	if d <= 0 {
		return
	}
	p.yieldWhile(func() { time.Sleep(d) })
}

// runGroup is a shared policy scope: it holds at most one run at a time, and
// its policy decides what happens when a run of it is started while another
// still holds it. The group records which run holds it, never which callback
// started that run, so runs started from different events relate exactly
// like two runs started from the same callback. One group can be shared by
// the callbacks of different events — the kind of Course where an onLog and
// an onExit both judge completion.
//
// groupMu is a leaf lock: its regions only read and write fields and
// manipulate the queue, with cancelling and starting left outside.
type runGroup struct {
	courseProgram *courseProgram
	policy        RunPolicy

	groupMu sync.Mutex
	holder  *run
	queue   []*run // runs waiting their turn under OneAtATime, in start order
}

// Start implements RunGroup: start a new run of the group executing body. It
// may only be called from Course code, which is where the token is held; the
// new run becomes a child of the current run and begins when that run next
// yields or ends, so the caller never waits for it.
//
// The gate is here, at the start, which is why the author never has to check
// an outcome:
//   - CancelPrevious marks the holder cancelled and the new run takes the
//     group over;
//   - SkipWhileBusy does not start the run at all while there is a holder;
//   - OneAtATime queues the run behind the holder; release lets it begin once
//     the holder ends.
//
// A run of the group starting another run of the same group is an author
// error rather than a policy question: under CancelPrevious it would cancel
// itself, under the other two the new run could never begin.
func (g *runGroup) Start(body func()) {
	g.courseProgram.requireRun("calling start")
	parent := g.courseProgram.current
	if parent == nil {
		panic("tutorial: RunGroup.start called outside Course code")
	}
	if parent.group == g {
		panic("tutorial: RunGroup.start called from a run of the same group")
	}
	r := newRun(body)
	r.group = g
	switch g.policy {
	case CancelPrevious:
		g.groupMu.Lock()
		holder := g.holder
		g.holder = r
		g.groupMu.Unlock()
		if holder != nil {
			holder.cancel()
		}
	case SkipWhileBusy:
		g.groupMu.Lock()
		busy := g.holder != nil
		if !busy {
			g.holder = r
		}
		g.groupMu.Unlock()
		if busy {
			return
		}
	case OneAtATime:
		g.groupMu.Lock()
		busy := g.holder != nil
		if busy {
			g.queue = append(g.queue, r)
		} else {
			g.holder = r
		}
		g.groupMu.Unlock()
		if busy {
			return
		}
	default:
		// The zero policy: no gate, the run simply begins.
	}
	parent.children = append(parent.children, r)
}

// release frees the group when its holder ends. Under OneAtATime the run at
// the head of the queue becomes the holder and is returned, for the ending
// run to start as its last child; otherwise nil. A run that is not the holder
// — one cancelled and replaced under CancelPrevious — releases nothing.
func (g *runGroup) release(r *run) *run {
	g.groupMu.Lock()
	defer g.groupMu.Unlock()
	if g.holder != r {
		return nil
	}
	g.holder = nil
	if g.policy == OneAtATime && len(g.queue) > 0 {
		next := g.queue[0]
		g.queue = g.queue[1:]
		g.holder = next
		return next
	}
	return nil
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

// startRun starts one run on its own goroutine and waits until it reaches its
// first yield or its end (yielded), which is spx's JoinYieldedOrDone. It
// reports false once the Course reached its terminal state, after which no
// run begins.
//
// Only startRuns and startChildren call it, which is what makes the
// beginning order structural.
func (p *courseProgram) startRun(r *run) bool {
	if !p.admitRun() {
		return false
	}
	go func() {
		defer p.runs.Done()
		p.runFrame(r)
	}()
	select {
	case <-r.yielded:
		return true
	case <-p.shutdown:
		return false
	}
}

// startRuns starts the runs of every registered callback for one trigger, in
// registration order, each reaching its first yield or its end before the
// next one begins. That way the dispatcher can keep handling later triggers
// once a callback suspends, and the runs of course start always precede the
// runs of host events.
//
// Only the dispatcher goroutine and Course.Start call it.
func startRuns[T any](p *courseProgram, regs []*registration[T], event T) {
	for _, reg := range regs {
		handler := reg.handler
		if !p.startRun(newRun(func() { handler(event) })) {
			return
		}
	}
}

// startChildren starts the runs r started with RunGroup.start, in start
// order, each reaching its first yield or its end before the next one begins.
// It is called when r yields or ends, after r returned the token and before r
// counts as yielded: a started run therefore always begins before whoever
// waits on r moves on, which keeps the beginning order structural. A child
// started after the Course reached its terminal state never begins.
func (p *courseProgram) startChildren(r *run) {
	children := r.children
	r.children = nil
	for _, child := range children {
		if !p.startRun(child) {
			return
		}
	}
}

// awaitShutdown waits for the Course to end, by completion or a fatal error.
//
// The completion path waits for every in-flight run to finish on its own: a
// suspended run resumes once the capability it waits on succeeds and executes
// its remaining statements; a run started but not yet begun, queued under
// OneAtATime or not, never begins. Capability failure or cancellation instead
// takes the fatal path; the dispatcher goroutine exits. The fatal path does
// not wait: it re-raises on the main goroutine right away, and suspended runs
// die with the process.
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

// mustCallCapability performs one capability call, treating a failure as fatal
// to the Course program.
func (p *courseProgram) mustCallCapability(name string, request, result any) {
	if err := p.tryCallCapability(name, request, result); err != nil {
		panic(err)
	}
}

// tryCallCapability performs one capability call with the execution semantics
// registered in capabilityKinds and returns its failure, decoding included.
func (p *courseProgram) tryCallCapability(name string, request, result any) error {
	p.requireRun("calling " + name)
	if capabilityKinds[name] == kindFast {
		return p.callCapability(name, request, result)
	}

	// Decode into a private buffer, and into result only once the token is
	// back. A cancelled run has already ended inside yieldWhile and never
	// reaches the filling step.
	var raw json.RawMessage
	var target any
	if result != nil {
		target = &raw
	}
	var err error
	p.yieldWhile(func() { err = p.callCapability(name, request, target) })
	if err != nil {
		return err
	}
	if result != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, result); err != nil {
			return fmt.Errorf("decode capability %q result: %w", name, err)
		}
	}
	return nil
}
