package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// pendingEventLimit is the capacity of the dispatch queue. Callbacks release
// the execution token while waiting on a waiting capability, so the dispatcher
// keeps draining the queue and a healthy Course stays far below this limit.
// Hitting it means the Course program really is out of control — a run looping
// forever without yielding, leaving the dispatcher waiting for its yielded
// signal. That must be reported to the host rather than dropped silently: what
// gets dropped may be the very judging signal the Course waits for, which is
// the hardest kind of failure to diagnose.
const pendingEventLimit = 1024

// eventDeliverer decodes one raw payload and starts the runs for it, on the
// dispatcher goroutine.
type eventDeliverer func(p *courseProgram, payload json.RawMessage) error

// eventDeliverers holds the decoding and starting logic for every event in
// the contract. Its key set is exactly the set of event names the framework
// registers with the executor, and client_contract_test.go checks that set
// against the contract.
//
// Registering all of them is a hard requirement: the host does not know what
// the Course subscribed to, and should not need to. An event the Course did
// not subscribe to has no callback to start and is simply abandoned, which
// matches the author's intuition.
var eventDeliverers = map[string]eventDeliverer{
	"editor.runtime.start": decodeThen("editor.runtime.start", func(p *courseProgram, _ struct{}) error {
		startRuns(p, p.handlerSnapshot().runtimeStart, struct{}{})
		return nil
	}),
	"editor.runtime.exit": decodeThen("editor.runtime.exit", func(p *courseProgram, event runtimeExitEvent) error {
		startRuns(p, p.handlerSnapshot().runtimeExit, event.Code)
		return nil
	}),
	"editor.runtime.log": decodeThen("editor.runtime.log", func(p *courseProgram, event runtimeLogEvent) error {
		startRuns(p, p.handlerSnapshot().runtimeLog, event.Log)
		return nil
	}),
	"copilot.roundFinish": decodeThen("copilot.roundFinish", func(p *courseProgram, round CopilotRound) error {
		startRuns(p, p.handlerSnapshot().copilotRound, round)
		return nil
	}),
}

// runtimeExitEvent is the {code} payload of editor.runtime.exit in the
// contract.
type runtimeExitEvent struct {
	Code int `json:"code"`
}

// runtimeLogEvent is the {log} payload of editor.runtime.log in the contract.
// The contract restricts this channel to kind=log output; error output does
// not enter the judging channel. The Tutorial module filters before
// dispatching, and the framework hands the Course whatever it receives.
type runtimeLogEvent struct {
	Log string `json:"log"`
}

// decodeThen lets the four events share one decoding path, with T as each
// one's payload type. An empty payload, or "null" as editor.runtime.start
// sends, skips decoding and uses the zero value.
func decodeThen[T any](name string, deliver func(*courseProgram, T) error) eventDeliverer {
	return func(p *courseProgram, payload json.RawMessage) error {
		var event T
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &event); err != nil {
				return fmt.Errorf("decode event %q: %w", name, err)
			}
		}
		return deliver(p, event)
	}
}

// events is the process-level event entry.
//
// The handlers are registered with the executor during package
// initialization: this package is compiled natively into xgoexec.wasm, so init
// runs before any Course program is built or run. Once the host's run()
// resolves, something is therefore always there to receive a dispatch — and
// the executor's run() resolves the moment the interpreter goroutine starts,
// well before the Course program registers any callback. Dispatches landing in
// that window must be neither lost nor reordered: they sit in the same queue
// as later ones and the dispatcher goroutine handles them in arrival order
// once the Course program is ready.
//
// The executor's own registry is process-level (that is the executor's bridge,
// not our state): each Course runs in its own Worker/WASM instance and an
// instance runs a single Course; several programs in one process only happen
// in tests.
var events = &eventRegistry{}

func init() {
	for name, deliver := range eventDeliverers {
		xgoexec.RegisterEventHandler(name, func(payload json.RawMessage) error {
			return events.dispatch(name, deliver, payload)
		})
	}
}

// eventRegistry records the current Course program and owns the single
// dispatch queue.
//
// A dispatch from the host only enqueues, so the host goroutine returns
// immediately; the dispatcher goroutine that goLive starts then takes events
// in arrival order, decodes them and starts the runs. That queue doubles as
// the pre-ready buffer: events enqueued before attach and before goLive are
// simply the first batch the dispatcher handles.
//
// registryMu is a leaf lock: its regions only read and write fields and
// manipulate the slice, with decoding and dispatching left outside;
// scheduling_invariants_test.go enforces that with a call allowlist.
type eventRegistry struct {
	registryMu sync.Mutex
	program    *courseProgram
	pending    []pendingEvent
	// wake signals "there is new work" to the current program's dispatcher.
	// It is cap-1 and sent to without blocking: it only means "take a look at
	// the queue" and carries no event itself. Every attach installs a fresh
	// one, so a dispatcher left over from a replaced program waits on the old
	// channel and cannot swallow the new program's signals.
	wake chan struct{}
}

type pendingEvent struct {
	name    string
	deliver eventDeliverer
	payload json.RawMessage
}

// attach makes p the current program. Only XGot_Course_Main calls it, before
// MainEntry.
//
// With no program in the process yet, the queue holds events buffered before
// the program was ready and they belong to p. With one already there — several
// programs in one process, which only happens in tests — the queue holds
// events the previous program never got to, which belong to it rather than to
// p, so they are dropped.
func (r *eventRegistry) attach(p *courseProgram) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != nil {
		r.pending = nil
	}
	r.program = p
	r.wake = make(chan struct{}, 1)
}

// dispatch is where the executor calls in, on the host's goroutine: enqueue
// and wake the dispatcher. Once the current program reached its terminal
// state, the event is dropped silently — the learner's game may well still be
// printing logs, and the host did nothing wrong. A full queue means the host
// is flooding a program that does not consume, which is worth an error rather
// than unbounded buffering.
func (r *eventRegistry) dispatch(name string, deliver eventDeliverer, payload json.RawMessage) error {
	if p := r.current(); p != nil && p.terminated() {
		return nil
	}
	wake, err := r.enqueue(name, deliver, payload)
	if err != nil {
		return err
	}
	if wake != nil {
		select {
		case wake <- struct{}{}:
		default:
		}
	}
	return nil
}

func (r *eventRegistry) current() *courseProgram {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	return r.program
}

// enqueue appends under the lock and returns the channel to wake, or nil when
// there is no program yet and the event waits for attach.
func (r *eventRegistry) enqueue(name string, deliver eventDeliverer, payload json.RawMessage) (chan struct{}, error) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if len(r.pending) >= pendingEventLimit {
		return nil, fmt.Errorf("course event queue is full: the course program is not consuming events")
	}
	// The payload comes from the executor's bridge; copy it rather than
	// assuming it stays valid after this call returns.
	r.pending = append(r.pending, pendingEvent{name: name, deliver: deliver, payload: append(json.RawMessage(nil), payload...)})
	return r.wake, nil
}

// goLive starts p's dispatcher goroutine: handle the queued events in arrival
// order until the Course reaches its terminal state or p is replaced by
// another program, which only happens in tests running several programs in one
// process. Only Course.Start calls it, after starting the course-start runs,
// so those always precede the runs of any host event.
//
// A failed delivery — a payload that will not decode — is recorded as fatal:
// that is a host bug, and swallowing it would just make the Course look
// unresponsive.
func (r *eventRegistry) goLive(p *courseProgram) {
	if !p.admitRun() {
		return
	}
	go func() {
		defer p.runs.Done()
		for {
			batch, wake, ok := r.takePending(p)
			if !ok {
				return
			}
			for _, event := range batch {
				if err := event.deliver(p, event.payload); err != nil {
					p.recordFatal(err)
					return
				}
			}
			select {
			case <-wake:
			case <-p.shutdown:
				return
			}
		}
	}()
}

// takePending takes the whole queue under the lock, along with p's wake
// channel; ok is false once p has been replaced by another program.
func (r *eventRegistry) takePending(p *courseProgram) (batch []pendingEvent, wake chan struct{}, ok bool) {
	r.registryMu.Lock()
	defer r.registryMu.Unlock()
	if r.program != p {
		return nil, nil, false
	}
	batch, r.pending = r.pending, nil
	return batch, r.wake, true
}
