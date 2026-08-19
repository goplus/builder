package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/goplus/builder/tools/xgoexec"
)

// capabilityCall records one capability the Course program invoked.
type capabilityCall struct {
	name    string
	request string
}

// fakeHost stands in for the frontend: it records capability calls and answers
// them from canned responses, so a Course program can run without a Worker.
type fakeHost struct {
	mu        sync.Mutex
	calls     []capabilityCall
	responses map[string]string
	fail      map[string]error
}

func newFakeHost(t *testing.T) *fakeHost {
	t.Helper()
	host := &fakeHost{
		responses: map[string]string{},
		fail:      map[string]error{},
	}
	original := callCapability
	callCapability = host.call
	t.Cleanup(func() { callCapability = original })
	return host
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
	p.mu.Unlock()

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

// testCourse is what XGo generates for a Course program: the framework Course
// embedded in a class whose MainEntry holds the Course code.
type testCourse struct {
	Course
	mainEntry func(*testCourse)
}

func (p *testCourse) MainEntry() { p.mainEntry(p) }

// runCourse runs one Course program the way the executor does and returns once
// the program exits. It fails the test rather than hanging forever.
func runCourse(t *testing.T, mainEntry func(*testCourse)) {
	t.Helper()
	done := make(chan struct{})
	go func() {
		defer close(done)
		Gopt_Course_Main(&testCourse{mainEntry: mainEntry})
	}()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("course program did not exit")
	}
}

// dispatch delivers a host event, retrying briefly because the Course program
// starts asynchronously in these tests.
func dispatch(t *testing.T, name string, payload string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for {
		err := xgoexec.DispatchEvent(name, []byte(payload))
		if err == nil {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("dispatch %q: %v", name, err)
		}
		time.Sleep(time.Millisecond)
	}
}

func TestCompletionEndsTheProgram(t *testing.T) {
	host := newFakeHost(t)

	runCourse(t, func(course *testCourse) {
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
	host := newFakeHost(t)

	runCourse(t, func(course *testCourse) {
		course.OnStart(func() {
			course.Complete()
			// A Course that falls through into another branch must not
			// complete twice.
			course.CompleteWith("second")
		})
	})

	if got, want := fmt.Sprint(host.names()), "[course_complete]"; got != want {
		t.Errorf("capability calls = %s, want %s", got, want)
	}
}

func TestRuntimeLogsArriveInOrder(t *testing.T) {
	newFakeHost(t)

	var logs []string
	runCourse(t, func(course *testCourse) {
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
	newFakeHost(t)

	var logs []string
	runCourse(t, func(course *testCourse) {
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
	newFakeHost(t)

	runCourse(t, func(course *testCourse) {
		course.OnStart(func() {
			// The Course subscribed to nothing: the host must still be able to
			// dispatch, and the events are simply dropped.
			dispatch(t, "editor.runtime.start", `null`)
			dispatch(t, "editor.runtime.exit", `{"code":0}`)
			dispatch(t, "copilot.roundFinish", `{"userMessage":"hi","resultMessages":["hello"]}`)
			course.Complete()
		})
	})
}

func TestRuntimeExitAndCopilotRoundPayloads(t *testing.T) {
	newFakeHost(t)

	var exitCode int
	var round CopilotRound
	runCourse(t, func(course *testCourse) {
		course.Editor.Runtime.OnExit(func(code int) { exitCode = code })
		course.Copilot.OnRoundFinish(func(finished CopilotRound) {
			round = finished
			course.Complete()
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
	newFakeHost(t)

	release := make(chan struct{})
	overflow := make(chan error, 1)

	runCourse(t, func(course *testCourse) {
		course.Editor.Runtime.OnLog(func(log string) {
			if log == "block" {
				// Stand in for a slow capability, such as an LLM round, during
				// which the program cannot consume events.
				<-release
			}
		})
		course.OnStart(func() {
			dispatch(t, "editor.runtime.log", `{"log":"block"}`)
			var err error
			for i := 0; err == nil && i < eventQueueSize*2; i++ {
				err = xgoexec.DispatchEvent("editor.runtime.log", []byte(`{"log":"flood"}`))
			}
			overflow <- err
			close(release)
			course.Complete()
		})
	})

	if err := <-overflow; err == nil {
		t.Error("expected the host to be told the event queue is full")
	}
}

func TestCapabilityFailureStopsTheCourse(t *testing.T) {
	host := newFakeHost(t)
	host.fail["course_showMessage"] = fmt.Errorf("no dialog")

	done := make(chan any, 1)
	go func() {
		defer func() { done <- recover() }()
		Gopt_Course_Main(&testCourse{mainEntry: func(course *testCourse) {
			course.OnStart(func() { course.ShowMessage("hi") })
		}})
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
