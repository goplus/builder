package ai

import "sync"

// TaskRunner is a function type that defines a task runner. It takes a
// function as an argument and executes it. This is useful for running tasks in
// a specific context, such as in a goroutine or on the main thread.
type TaskRunner func(task func())

var (
	// defaultTaskRunner is the default task runner for AI players.
	defaultTaskRunner   TaskRunner = func(task func()) { task() }
	defaultTaskRunnerMu sync.RWMutex
)

// DefaultTaskRunner returns the default [TaskRunner] instance.
func DefaultTaskRunner() TaskRunner {
	defaultTaskRunnerMu.RLock()
	defer defaultTaskRunnerMu.RUnlock()
	return defaultTaskRunner
}

// SetDefaultTaskRunner sets the default instance of [TaskRunner]. If nil is
// provided, it sets to an immediate execution task runner that runs functions
// synchronously.
func SetDefaultTaskRunner(tr TaskRunner) {
	defaultTaskRunnerMu.Lock()
	defer defaultTaskRunnerMu.Unlock()
	if tr == nil {
		tr = func(task func()) { task() }
	}
	defaultTaskRunner = tr
}
