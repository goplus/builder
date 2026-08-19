package tutorial

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/goplus/builder/tools/xgoexec"
)

// eventQueueSize bounds how many host events may wait for the Course program.
// Course code blocks while a capability is in flight, and an LLM round takes
// seconds, so a burst of runtime logs has to queue up meanwhile.
const eventQueueSize = 64

// callCapability is a variable so tests can drive the framework without the
// Worker bridge, which only exists in js/wasm builds.
var callCapability = xgoexec.CallCapability

// program is the state of the one Course program this instance runs. The
// executor gives each Course its own Worker and WASM instance, so there is
// never more than one.
var program struct {
	sync.Mutex
	handlers  handlers
	events    chan func()
	completed bool
}

// handlers holds the callbacks the Course program registered. They are stored
// per program rather than per namespace value so that the framework can
// register every host event up front, whether or not the Course subscribed.
type handlers struct {
	runtimeStart func()
	runtimeExit  func(code int)
	runtimeLog   func(log string)
	copilotRound func(round CopilotRound)
}

func startProgram() {
	program.Lock()
	program.handlers = handlers{}
	program.events = make(chan func(), eventQueueSize)
	program.completed = false
	program.Unlock()

	registerEvent("editor.runtime.start", func(struct{}) {
		if handler := currentHandlers().runtimeStart; handler != nil {
			handler()
		}
	})
	registerEvent("editor.runtime.exit", func(event runtimeExitEvent) {
		if handler := currentHandlers().runtimeExit; handler != nil {
			handler(event.Code)
		}
	})
	registerEvent("editor.runtime.log", func(event runtimeLogEvent) {
		if handler := currentHandlers().runtimeLog; handler != nil {
			handler(event.Log)
		}
	})
	registerEvent("copilot.roundFinish", func(round CopilotRound) {
		if handler := currentHandlers().copilotRound; handler != nil {
			handler(round)
		}
	})
}

type runtimeExitEvent struct {
	Code int `json:"code"`
}

type runtimeLogEvent struct {
	Log string `json:"log"`
}

// registerEvent decodes one host event and queues its callback. Decoding
// happens on the host's goroutine while the callback runs in program order on
// the Course program's own goroutine.
func registerEvent[T any](name string, dispatch func(T)) {
	xgoexec.RegisterEventHandler(name, func(payload json.RawMessage) error {
		var event T
		if len(payload) > 0 {
			if err := json.Unmarshal(payload, &event); err != nil {
				return fmt.Errorf("decode event %q: %w", name, err)
			}
		}
		return enqueue(func() { dispatch(event) })
	})
}

func enqueue(callback func()) error {
	program.Lock()
	events, completed := program.events, program.completed
	program.Unlock()

	switch {
	case events == nil:
		return fmt.Errorf("course program is not running")
	case completed:
		// The Course finished; nothing is left to observe the event.
		return nil
	}
	select {
	case events <- callback:
		return nil
	default:
		return fmt.Errorf("course event queue is full: the course program is not consuming events")
	}
}

func currentHandlers() handlers {
	program.Lock()
	defer program.Unlock()
	return program.handlers
}

func setHandler(set func(*handlers)) {
	program.Lock()
	defer program.Unlock()
	set(&program.handlers)
}

// markCompleted reports whether this is the first completion; later ones are
// ignored so a Course cannot complete twice.
func markCompleted() bool {
	program.Lock()
	defer program.Unlock()
	if program.completed {
		return false
	}
	program.completed = true
	return true
}

func completed() bool {
	program.Lock()
	defer program.Unlock()
	return program.completed
}

// mustCallCapability treats a failed capability as fatal to the Course
// program: the Course cannot meaningfully continue when the editor, Copilot or
// presentation it asked for did not happen.
func mustCallCapability(name string, request, result any) {
	if err := callCapability(name, request, result); err != nil {
		panic(err)
	}
}
