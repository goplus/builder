package ai

import (
	"sync"
	"testing"
	"time"
)

func TestDefaultTaskRunner(t *testing.T) {
	originalTaskRunner := DefaultTaskRunner()
	t.Cleanup(func() { SetDefaultTaskRunner(originalTaskRunner) })

	executed := false
	DefaultTaskRunner()(func() { executed = true })
	if !executed {
		t.Error("default task runner did not execute the function")
	}

	executed = false
	wasExecuted := false
	customTaskRunner := func(task func()) {
		wasExecuted = true
		task()
	}
	SetDefaultTaskRunner(customTaskRunner)
	DefaultTaskRunner()(func() { executed = true })
	if !wasExecuted {
		t.Error("custom task runner was not used")
	}
	if !executed {
		t.Error("custom task runner did not execute the function")
	}

	executed = false
	SetDefaultTaskRunner(nil)
	DefaultTaskRunner()(func() { executed = true })
	if !executed {
		t.Error("nil task runner replacement did not execute the function")
	}

	executed = false
	var wg sync.WaitGroup
	wg.Add(1)
	asyncTaskRunner := func(task func()) {
		go func() {
			task()
			wg.Done()
		}()
	}
	SetDefaultTaskRunner(asyncTaskRunner)
	DefaultTaskRunner()(func() { executed = true })
	wg.Wait()
	if !executed {
		t.Error("async task runner did not execute the function")
	}

	executed = false
	var delayWG sync.WaitGroup
	delayWG.Add(1)
	delayedTaskRunner := func(task func()) {
		time.AfterFunc(10*time.Millisecond, func() {
			task()
			delayWG.Done()
		})
	}
	SetDefaultTaskRunner(delayedTaskRunner)
	DefaultTaskRunner()(func() { executed = true })
	delayWG.Wait()
	if !executed {
		t.Error("delayed task runner did not execute the function")
	}
}
