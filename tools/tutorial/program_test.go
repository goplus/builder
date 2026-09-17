package tutorial

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityCall records one capability call the Course program made.
type capabilityCall struct {
	name    string
	request string
}

// capabilityHold lets a test turn a capability into one that suspends until
// released: each arriving call signals started, then blocks until release lets
// one through. It reproduces the real rhythm of presentation waiting on the
// learner and of LLM capabilities waiting on generation.
type capabilityHold struct {
	started chan struct{}
	release chan struct{}
}

// fakeHost stands in for the frontend host: it records the capability calls a
// Course makes and answers them with canned responses, which lets a Course
// program run under plain go test, outside a Worker or WASM.
//
// This is exactly what courseProgram.callCapability being a field is for: the
// real bridge only exists under js/wasm, and without that seam the execution
// model and the completion semantics could only be verified by hand in a
// browser.
type fakeHost struct {
	mu        sync.Mutex
	calls     []capabilityCall
	responses map[string]string
	fail      map[string]error
	holds     map[string]*capabilityHold
}

func newFakeHost() *fakeHost {
	return &fakeHost{
		responses: map[string]string{},
		fail:      map[string]error{},
		holds:     map[string]*capabilityHold{},
	}
}

// holdCapability makes every call to name suspend: a signal on started means
// one call arrived and is suspended, and release() lets one call through.
func (p *fakeHost) holdCapability(name string) (started <-chan struct{}, release func()) {
	hold := &capabilityHold{
		started: make(chan struct{}, 16),
		release: make(chan struct{}, 16),
	}
	p.mu.Lock()
	p.holds[name] = hold
	p.mu.Unlock()
	return hold.started, func() { hold.release <- struct{}{} }
}

func (p *fakeHost) call(name string, request, result any) error {
	encoded, err := json.Marshal(request)
	if err != nil {
		return err
	}

	p.mu.Lock()
	p.calls = append(p.calls, capabilityCall{name: name, request: string(encoded)})
	response, hasResponse := p.responses[name]
	failure := p.fail[name]
	hold := p.holds[name]
	p.mu.Unlock()

	if hold != nil {
		hold.started <- struct{}{}
		<-hold.release
	}
	if failure != nil {
		return failure
	}
	if result == nil || !hasResponse {
		return nil
	}
	return json.Unmarshal([]byte(response), result)
}

func (p *fakeHost) names() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	names := make([]string, len(p.calls))
	for i, call := range p.calls {
		names[i] = call.name
	}
	return names
}

func (p *fakeHost) requestOf(name string) (string, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, call := range p.calls {
		if call.name == name {
			return call.request, true
		}
	}
	return "", false
}

// testCourse reproduces by hand the shape XGo generates for a Course program:
// the framework's Course embedded in a class whose MainEntry carries the code
// the author wrote. Tests pass a closure as MainEntry, so each case registers
// callbacks the way a Course would.
type testCourse struct {
	Course
	mainEntry func(*testCourse)
}

func (p *testCourse) MainEntry() { p.mainEntry(p) }

// newTestCourse assembles a Course program and swaps its capability bridge
// for a fake host.
//
// MainEntry is the only place to swap it: initCourse has just initialized the
// run state, the real bridge included, and Course code does not start running
// until MainEntry, which makes this the earliest and only suitable injection
// point.
func newTestCourse(host *fakeHost, mainEntry func(*testCourse)) *testCourse {
	return &testCourse{mainEntry: func(course *testCourse) {
		course.courseProgram.callCapability = host.call
		mainEntry(course)
	}}
}

// startCourse starts a Course program asynchronously and returns the signal
// for its end.
func startCourse(host *fakeHost, mainEntry func(*testCourse)) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		XGot_Course_Main(newTestCourse(host, mainEntry))
	}()
	return done
}

// runCourse runs a Course program the way the executor does and returns once
// it exits. The timeout fallback turns "the program failed to exit" into a
// test failure rather than a hung go test.
func runCourse(t *testing.T, host *fakeHost, mainEntry func(*testCourse)) {
	t.Helper()
	awaitDone(t, startCourse(host, mainEntry))
}

func awaitDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// dispatch delivers an event from the "host" through xgoexec.DispatchEvent,
// the real entry point. The event handlers are registered during package
// initialization (see events.go), so nothing here has to wait or retry.
func dispatch(t *testing.T, name string, payload string) {
	t.Helper()
	if err := xgoexec.DispatchEvent(name, []byte(payload)); err != nil {
		t.Fatalf("dispatch %q: %v", name, err)
	}
}

// resetEventRegistry returns the process-level event entry to its "no program
// yet" state, simulating a freshly started wasm instance whose Course program
// has not attached.
func resetEventRegistry() {
	events.registryMu.Lock()
	defer events.registryMu.Unlock()
	events.program, events.pending = nil, nil
}

// await waits for a signal, treating a timeout as a test failure.
func await(t *testing.T, signal <-chan struct{}, what string) {
	t.Helper()
	awaitOne(t, signal, what)
}

// awaitOne waits for a signal carrying a value and returns it, treating a
// timeout as a test failure.
func awaitOne[T any](t *testing.T, signal <-chan T, what string) T {
	t.Helper()
	select {
	case value := <-signal:
		return value
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", what)
		var zero T
		return zero
	}
}

func TestCompletionEndsTheProgram(t *testing.T) {
	host := newFakeHost()

	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			course.ShowPrelude("Move Lita to Mushroom.")
			course.CompleteWith("Nicely done.")
		})
	})

	want := []string{"course_showPrelude", "course_completeWith"}
	got := host.names()
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("capability calls = %v, want %v", got, want)
	}
	if request, _ := host.requestOf("course_completeWith"); request != `{"content":"Nicely done."}` {
		t.Errorf("completeWith request = %s", request)
	}
}

func TestCompletionIsIdempotent(t *testing.T) {
	host := newFakeHost()

	runCourse(t, host, func(course *testCourse) {
		course.OnStart(func() {
			course.Complete()
			// When Course code forgets an else, or a queued event triggers the
			// judging callback once more, there must be no second completion:
			// the learner would see two completion dialogs.
			course.CompleteWith("second")
		})
	})

	if got, want := fmt.Sprint(host.names()), "[course_complete]"; got != want {
		t.Errorf("capability calls = %s, want %s", got, want)
	}
}

func TestRuntimeLogsArriveInOrder(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			logs = append(logs, log)
			if log == "third" {
				course.Complete()
			}
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"first"}`)
			dispatch(t, "editor.runtime.log", `{"log":"second"}`)
			dispatch(t, "editor.runtime.log", `{"log":"third"}`)
		})
	})

	if got, want := fmt.Sprint(logs), "[first second third]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

func TestEventsAfterCompletionAreNotDelivered(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			logs = append(logs, log)
			course.Complete()
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"reached-target"}`)
			dispatch(t, "editor.runtime.log", `{"log":"stray"}`)
		})
	})

	if got, want := fmt.Sprint(logs), "[reached-target]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

func TestUnsubscribedEventsAreAccepted(t *testing.T) {
	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.OnStart(func() {
			// The Course subscribed to nothing: the host must still be able to
			// dispatch successfully, with the events quietly dropped. The host
			// does not know what the Course subscribed to and must not get an
			// error over it.
			dispatch(t, "editor.runtime.start", `null`)
			dispatch(t, "editor.runtime.exit", `{"code":0}`)
			dispatch(t, "copilot.roundFinish", `{"userMessage":"hi","resultMessages":["hello"]}`)
			course.Complete()
		})
	})
}

func TestRuntimeExitAndCopilotRoundPayloads(t *testing.T) {
	var exitCode int
	var round CopilotRound
	seen := 0

	runCourse(t, newFakeHost(), func(course *testCourse) {
		// The two callbacks are independent and their finishing order is not
		// promised; both run under the execution token, so reading and
		// writing the shared counter is safe. Complete once both have run.
		note := func() {
			seen++
			if seen == 2 {
				course.Complete()
			}
		}
		course.Editor.Runtime.OnExit(func(code int) {
			exitCode = code
			note()
		})
		course.Copilot.OnRoundFinish(func(finished CopilotRound) {
			round = finished
			note()
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.exit", `{"code":2}`)
			dispatch(t, "copilot.roundFinish", `{"userMessage":"why","resultMessages":["because","ok"]}`)
		})
	})

	if exitCode != 2 {
		t.Errorf("exit code = %d, want 2", exitCode)
	}
	if round.UserMessage != "why" || fmt.Sprint(round.ResultMessages) != "[because ok]" {
		t.Errorf("round = %+v", round)
	}
}

func TestEventQueueOverflowIsReported(t *testing.T) {
	overflow := make(chan error, 1)

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {})
		course.OnStart(func() {
			// The start callback holds the execution token throughout, so the
			// onLog run cannot begin, the dispatcher never sees it yield, and
			// the queue only ever fills.
			var err error
			for i := 0; err == nil && i < pendingEventLimit*2; i++ {
				err = xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"flood"}`))
			}
			overflow <- err
			course.Complete()
		})
	})

	if err := <-overflow; err == nil {
		t.Error("expected the host to be told the event queue is full")
	}
}

func TestCapabilityFailureStopsTheCourse(t *testing.T) {
	host := newFakeHost()
	host.fail["course_showMessage"] = fmt.Errorf("no dialog")

	done := make(chan any, 1)
	go func() {
		defer func() { done <- recover() }()
		XGot_Course_Main(newTestCourse(host, func(course *testCourse) {
			course.OnStart(func() { course.ShowMessage("hi") })
		}))
	}()

	select {
	case recovered := <-done:
		if recovered == nil {
			t.Error("a failed capability must not be silently ignored")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// TestCoursesDoNotShareState checks that the run state really is per
// instance: two Course instances hold their own callbacks and completion flag
// and do not interfere. That is the property most worth guarding after the
// move from package-level state to instance-level.
func TestCoursesDoNotShareState(t *testing.T) {
	firstHost, secondHost := newFakeHost(), newFakeHost()

	first := newTestCourse(firstHost, func(course *testCourse) {
		course.OnStart(func() { course.ShowMessage("first") })
	})
	second := newTestCourse(secondHost, func(course *testCourse) {
		course.OnStart(func() { course.ShowMessage("second") })
	})

	// Initialize without running: neither has completed yet, and each one's
	// callbacks are registered only on itself.
	first.initCourse()
	second.initCourse()
	first.courseProgram.runFrame(newRun(), first.MainEntry)
	second.courseProgram.runFrame(newRun(), second.MainEntry)

	for _, reg := range first.courseProgram.handlerSnapshot().courseStart {
		first.courseProgram.runFrame(newRun(), func() { reg.handler(struct{}{}) })
	}
	if !first.courseProgram.markCompleted() {
		t.Fatal("the first course was already completed")
	}
	if second.courseProgram.isCompleted() {
		t.Error("completing one course must not complete another")
	}
	if got, want := fmt.Sprint(firstHost.names()), "[course_showMessage]"; got != want {
		t.Errorf("first host calls = %s, want %s", got, want)
	}
	if got := fmt.Sprint(secondHost.names()); got != "[]" {
		t.Errorf("second host received %s, want no calls", got)
	}
}

// TestHandlersAccumulate checks that every handler registered for one event
// takes effect, course start included. onXxx in Course code is an ordinary
// method call, and writing two handlers for one event is natural — say one per
// judging clue — so silently dropping either would be a hard failure to
// diagnose. spx's event registration accumulates the same way. The handlers
// are independent and their finishing order is not promised, between several
// onStart callbacks too, so the assertion is only that each ran exactly once.
// Completion waits for all four, because completing earlier would let the
// admission check discard the runs that have not started yet.
func TestHandlersAccumulate(t *testing.T) {
	var trace []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		note := func(entry string) {
			trace = append(trace, entry)
			if len(trace) == 4 {
				course.Complete()
			}
		}
		course.OnStart(func() { note("start-1") })
		course.OnStart(func() {
			note("start-2")
			dispatch(t, "editor.runtime.log", `{"log":"hit"}`)
		})
		course.Editor.Runtime.OnLog(func(log string) { note("log-A:" + log) })
		course.Editor.Runtime.OnLog(func(log string) { note("log-B:" + log) })
	})

	if len(trace) != 4 {
		t.Fatalf("trace = %v, want 4 entries", trace)
	}
	for _, want := range []string{"start-1", "start-2", "log-A:hit", "log-B:hit"} {
		if got := strings.Count(fmt.Sprint(trace), want); got != 1 {
			t.Errorf("trace = %v: %s appears %d times, want exactly once", trace, want, got)
		}
	}
}

// TestCourseStartHandlersRunIndependently checks that course start takes the
// same path as other events: while one onStart waits on a presentation
// capability for the learner, another onStart need not wait for it to return.
// Which of the two gets the token first is not promised, but either way the
// second one's signal must arrive before the presentation is released; were
// the start callbacks still running sequentially on the main goroutine, this
// wait would time out.
func TestCourseStartHandlersRunIndependently(t *testing.T) {
	host := newFakeHost()
	preludeShown, releasePrelude := host.holdCapability("course_showPrelude")
	otherRan := make(chan struct{}, 1)

	done := startCourse(host, func(course *testCourse) {
		course.OnStart(func() {
			course.ShowPrelude("welcome")
			course.Complete()
		})
		course.OnStart(func() { otherRan <- struct{}{} })
	})

	await(t, preludeShown, "the first onStart to suspend in showPrelude")
	await(t, otherRan, "the second onStart to run while the prelude is still up")
	releasePrelude()
	awaitDone(t, done)
}

// TestCallbackRegisteredDuringRunReceivesEvents checks that a callback
// registered while the Course runs, from inside another callback, receives
// events too: an onLog registered late gets the logs dispatched after it. That
// is how an author writes "start judging once the prelude has been read".
// Registration takes the same path at any time, and without that the late
// callback would sit in handlers with nothing ever running it.
func TestCallbackRegisteredDuringRunReceivesEvents(t *testing.T) {
	host := newFakeHost()
	registered := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.OnStart(func() {
			course.Editor.Runtime.OnLog(func(log string) {
				if log == "hit" {
					course.Complete()
				}
			})
			close(registered)
		})
	})

	await(t, registered, "the late onLog registration")
	dispatch(t, "editor.runtime.log", `{"log":"hit"}`)
	awaitDone(t, done)
}

// TestSameEventHandlersRunIndependently checks that the handlers registered
// for one event are independent: while one waits on a waiting capability, the
// other handles the same trigger as usual.
func TestSameEventHandlersRunIndependently(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	otherSeen := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			course.Copilot.GenerateText("judge " + log)
			course.Complete()
		})
		course.Editor.Runtime.OnLog(func(string) {
			otherSeen <- struct{}{}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"go"}`)
	await(t, generateStarted, "the first handler to suspend in generateText")
	// The first handler is still suspended, so the second must already have
	// handled — or still be able to handle — the same log.
	awaitOne(t, otherSeen, "the second handler to run independently")
	releaseGenerate()
	awaitDone(t, done)
}

// TestWaitingCapabilityYieldsToOtherEvents checks the execution model's
// central promise: while one callback waits on a presentation capability for
// the learner, the callbacks of other events run as usual, and the suspended
// callback reads fresh shared state once it resumes.
func TestWaitingCapabilityYieldsToOtherEvents(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	logNum := 0
	logSeen := make(chan struct{}, 16)
	var observed int
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			logNum++
			logSeen <- struct{}{}
		})
		course.Copilot.OnRoundFinish(func(CopilotRound) {
			course.ShowMessage("look at this")
			observed = logNum
			course.Complete()
		})
		// xgoexec's event registry is process-level: wait until this Course is
		// really running before dispatching, or the event is silently
		// swallowed by a completed program left over from a previous test.
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "copilot.roundFinish", `{"userMessage":"hi","resultMessages":["hello"]}`)
	await(t, messageShown, "showMessage to reach the host")
	// The dialog is still suspended, so the log event must be handled as
	// usual.
	for i := 0; i < 3; i++ {
		dispatch(t, "editor.runtime.log", `{"log":"tick"}`)
	}
	for i := 0; i < 3; i++ {
		await(t, logSeen, "a log callback to run during the dialog")
	}
	releaseMessage()
	awaitDone(t, done)

	if observed != 3 {
		t.Errorf("logNum observed after showMessage = %d, want 3", observed)
	}
}

// TestRunsOfOneCallbackOverlapByDefault checks that runs of one callback may
// overlap: while an earlier run waits on a waiting capability, a later one
// starts and finishes as usual, which is spx's semantics.
func TestRunsOfOneCallbackOverlapByDefault(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	var order []string
	fastDone := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			order = append(order, "begin:"+log)
			if log == "slow" {
				course.Copilot.GenerateText("judge")
			}
			order = append(order, "end:"+log)
			if log == "fast" {
				fastDone <- struct{}{}
			}
			if log == "slow" {
				course.Complete()
			}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"slow"}`)
	await(t, generateStarted, "generateText to reach the host")
	dispatch(t, "editor.runtime.log", `{"log":"fast"}`)
	await(t, fastDone, "the second run to finish while the first is suspended")
	releaseGenerate()
	awaitDone(t, done)

	want := "[begin:slow begin:fast end:fast end:slow]"
	if got := fmt.Sprint(order); got != want {
		t.Errorf("order = %s, want %s", got, want)
	}
}

// TestCallbacksStartInRegistrationOrder pins down what startRuns currently
// does: within one trigger the callbacks start in registration order, the next
// one starting only once the previous reached its first wait, and running as
// usual while that one stays suspended. This is an implementation detail
// rather than a contract (see #3509); the test exists so that whoever changes
// it does so deliberately, not so that Course code may depend on it.
func TestCallbacksStartInRegistrationOrder(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	var trace []string
	secondRan := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(string) {
			trace = append(trace, "first")
			course.ShowMessage("look")
		})
		course.Editor.Runtime.OnLog(func(string) {
			trace = append(trace, "second")
			secondRan <- struct{}{}
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.log", `{"log":"go"}`)
	await(t, messageShown, "the first callback to suspend in showMessage")
	await(t, secondRan, "the second callback to run while the first is suspended")
	releaseMessage()
	awaitDone(t, done)

	if got, want := fmt.Sprint(trace), "[first second]"; got != want {
		t.Errorf("trace = %s, want %s", got, want)
	}
}

// TestPresentationCallsMayOverlap checks that the framework does not
// serialize presentation calls: with two callbacks each showing a dialog, both
// showMessage calls are pending on the host at once, and what to do about the
// overlap is the host capability's policy.
func TestPresentationCallsMayOverlap(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")

	ready := make(chan struct{})
	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			course.ShowMessage("first")
		})
		course.Editor.Runtime.OnExit(func(int) {
			course.ShowMessage("second")
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	await(t, messageShown, "the first showMessage to reach the host")
	await(t, messageShown, "the second showMessage to reach the host while the first is open")
	releaseMessage()
	releaseMessage()
	awaitDone(t, done)
}

// TestSlowCapabilitiesRunConcurrently checks that non-presentation waiting
// capabilities can be in flight concurrently: with two callbacks each waiting
// on one LLM generation, both requests are pending on the host at once.
func TestSlowCapabilitiesRunConcurrently(t *testing.T) {
	host := newFakeHost()
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateText")

	ready := make(chan struct{})
	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			course.Copilot.GenerateText("first")
		})
		course.Editor.Runtime.OnExit(func(int) {
			course.Copilot.GenerateText("second")
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	// Both generateText calls must be suspended on the host: waiting
	// capabilities do not block one another.
	await(t, generateStarted, "the first generateText to reach the host")
	await(t, generateStarted, "the second generateText to reach the host")
	releaseGenerate()
	releaseGenerate()
	awaitDone(t, done)
}

// TestFatalDuringCompletionIsReported checks that a fatal error arriving late
// on the completion path is not swallowed: Complete enters the terminal state
// before calling course_complete, and if that call fails the program must exit
// with an error rather than be reported as completed.
func TestFatalDuringCompletionIsReported(t *testing.T) {
	host := newFakeHost()
	host.fail["course_complete"] = fmt.Errorf("completion rejected")

	done := make(chan any, 1)
	go func() {
		defer func() { done <- recover() }()
		XGot_Course_Main(newTestCourse(host, func(course *testCourse) {
			course.OnStart(func() { course.Complete() })
		}))
	}()

	select {
	case recovered := <-done:
		if recovered == nil {
			t.Error("a failed completion capability must not be reported as completed")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// TestQueuedEventDroppedWhenCompletionWinsTheToken checks the admission check
// that happens after acquiring the token: an event's run is waiting for the
// token when another run completes the Course, and the waiting run must then
// give up rather than execute a callback after the Course has ended.
func TestQueuedEventDroppedWhenCompletionWinsTheToken(t *testing.T) {
	// This test dispatches from the test goroutine without awaiting a
	// readiness signal, so it first clears the event entry to "no program
	// yet": early dispatches are then buffered and handled once this Course
	// is ready, instead of landing on a program left over from a previous
	// test.
	resetEventRegistry()
	host := newFakeHost()
	holding := make(chan struct{})
	proceed := make(chan struct{})
	exitRan := make(chan struct{}, 1)

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			close(holding) // this run holds the token and waits for the test
			<-proceed
			course.Complete()
		})
		course.Editor.Runtime.OnExit(func(int) {
			exitRan <- struct{}{}
		})
		course.OnStart(func() {})
	})

	// Dispatch exit once the runtime.start run holds the token: the exit run
	// is then either already waiting for the token or not yet started by the
	// dispatcher, and in neither case may it execute after completion.
	dispatch(t, "editor.runtime.start", `null`)
	await(t, holding, "the start callback to hold the token")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	close(proceed) // the token holder now completes the Course and returns the token
	awaitDone(t, done)

	select {
	case <-exitRan:
		t.Error("a callback started after completion despite the admission check")
	default:
	}
}

// TestGenerateJSONDecodesUnderTheToken checks that a waiting call's response
// is filled in while the token is held: when the author shares one struct
// between two callbacks, the other one's writes during the yield do not race
// with the bridge's decoding — this case is mainly guarded by -race — and the
// generated value does end up written.
func TestGenerateJSONDecodesUnderTheToken(t *testing.T) {
	type feedback struct {
		Praise string `json:"praise"`
	}
	host := newFakeHost()
	host.responses["copilot_generateJSON"] = `{"praise":"generated"}`
	generateStarted, releaseGenerate := host.holdCapability("copilot_generateJSON")

	shared := &feedback{}
	touched := make(chan struct{})
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			course.Copilot.GenerateJSON("judge", shared)
			course.Complete()
		})
		course.Editor.Runtime.OnLog(func(string) {
			shared.Praise = "poked by another callback"
			touched <- struct{}{}
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	await(t, generateStarted, "generateJSON to reach the host")
	// While generation is suspended, the other callback writes the same
	// struct: were decoding not back under the token, this would race.
	dispatch(t, "editor.runtime.log", `{"log":"poke"}`)
	await(t, touched, "the other callback to write the shared struct")
	releaseGenerate()
	awaitDone(t, done)

	if shared.Praise != "generated" {
		t.Errorf("shared.Praise = %q, want the generated value", shared.Praise)
	}
}

// TestCompletionSettlesPendingWait checks that once the host settles a
// waiting call that was in flight at completion, the suspended run executes
// its remaining statements and the program winds down as completed. The
// contract requires the host to settle every pending call promptly after a
// completion.
func TestCompletionSettlesPendingWait(t *testing.T) {
	host := newFakeHost()
	messageShown, releaseMessage := host.holdCapability("course_showMessage")
	resumed := make(chan struct{}, 1)
	ready := make(chan struct{})

	done := startCourse(host, func(course *testCourse) {
		course.Editor.Runtime.OnStart(func() {
			course.ShowMessage("still open")
			resumed <- struct{}{}
		})
		course.Editor.Runtime.OnExit(func(int) {
			course.Complete()
		})
		course.OnStart(func() { close(ready) })
	})

	await(t, ready, "the course to start")
	dispatch(t, "editor.runtime.start", `null`)
	await(t, messageShown, "showMessage to reach the host")
	dispatch(t, "editor.runtime.exit", `{"code":0}`)
	// The Course has completed while showMessage is still suspended; the
	// host settles it as the contract requires.
	releaseMessage()
	awaitDone(t, done)
	await(t, resumed, "the suspended callback to finish its remaining statements")
}

// TestEventsBeforeReadyAreDeliveredInOrder checks that events arriving before
// the program is ready are neither lost nor reordered: the executor's run()
// resolves before the program registers its callbacks, and a dispatch made in
// that window must still be delivered, in arrival order, once the program is
// ready. Dispatching from inside MainEntry before onLog is registered
// reproduces exactly that window; an earlier implementation found no receiver
// for these logs and dropped them silently.
func TestEventsBeforeReadyAreDeliveredInOrder(t *testing.T) {
	var logs []string

	runCourse(t, newFakeHost(), func(course *testCourse) {
		dispatch(t, "editor.runtime.log", `{"log":"first"}`)
		dispatch(t, "editor.runtime.log", `{"log":"second"}`)
		course.Editor.Runtime.OnLog(func(log string) {
			logs = append(logs, log)
			if log == "third" {
				course.Complete()
			}
		})
		dispatch(t, "editor.runtime.log", `{"log":"third"}`)
	})

	if got, want := fmt.Sprint(logs), "[first second third]"; got != want {
		t.Errorf("logs = %s, want %s", got, want)
	}
}

// TestEventsBeforeAnyProgramAreHeld checks that a dispatch made while the
// process has no program yet is buffered too: the host dispatches as soon as
// run() resolves, before the interpreter has reached XGot_Course_Main.
func TestEventsBeforeAnyProgramAreHeld(t *testing.T) {
	resetEventRegistry()
	dispatch(t, "editor.runtime.log", `{"log":"early"}`)

	runCourse(t, newFakeHost(), func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			if log == "early" {
				course.Complete()
			}
		})
	})
}

// TestPendingEventsAreBounded checks that the buffer is bounded: when the
// host floods a program that never gets going, a dispatch beyond the limit
// fails instead of buffering without end.
func TestPendingEventsAreBounded(t *testing.T) {
	resetEventRegistry()
	t.Cleanup(resetEventRegistry)

	for i := 0; i < pendingEventLimit; i++ {
		if err := xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"x"}`)); err != nil {
			t.Fatalf("dispatch %d: %v", i, err)
		}
	}
	if err := xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"x"}`)); err == nil {
		t.Fatal("a dispatch beyond the pending limit must fail")
	}
}
