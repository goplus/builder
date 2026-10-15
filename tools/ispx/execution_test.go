package main

import (
	"sync"
	"testing"

	"github.com/goplus/ixgo"
	"github.com/visualfc/gid"
)

const executionSource = `package main
func Nested(invoke func(func()), check func()) {
	invoke(func() { check() })
	check()
}
func Panic(check func()) { defer check(); panic("cancelled") }
func Wait(wait func()) { wait() }
func main() {}
`

func newTrackedInterp(t *testing.T, onEnd func()) *ixgo.Interp {
	t.Helper()
	tracker := newExecutionTracker(onEnd)
	ctx := ixgo.NewContext(ixgo.SupportMultipleInterp | ixgo.EnableCachedReg)
	ctx.SetExecutionHooks(tracker.enter, tracker.leave)
	i, err := ctx.LoadInterp("execution.go", executionSource)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(i.UnsafeRelease)
	return i
}

func TestExecutionTrackerNestedAndPanic(t *testing.T) {
	ended := 0
	owner := gid.Get()
	i := newTrackedInterp(t, func() {
		if gid.Get() != owner {
			t.Error("completion ran on a different goroutine")
		}
		ended++
	})
	check := func() {
		if ended != 0 {
			t.Error("nested callback completed the outer invocation")
		}
	}
	if _, err := i.RunFunc("Nested", func(f func()) { f() }, check); err != nil {
		t.Fatal(err)
	}
	if ended != 1 {
		t.Fatalf("completion count = %d; want 1", ended)
	}
	_, err := i.RunFunc("Panic", func() {
		if ended != 1 {
			t.Error("completion preceded interpreted defer")
		}
	})
	if err == nil || ended != 2 {
		t.Fatalf("panic: err=%v, completions=%d; want error and 2", err, ended)
	}
	if _, err := i.RunFunc("main"); err != nil {
		t.Fatal(err)
	}
	if ended != 3 {
		t.Fatal("subsequent invocation did not finish independently")
	}
}

func TestExecutionTrackerConcurrentCallbacks(t *testing.T) {
	ended := make(chan uint64, 2)
	i := newTrackedInterp(t, func() { ended <- gid.Get() })
	fn, ok := i.GetFunc("Wait")
	if !ok {
		t.Fatal("missing function")
	}
	entered := make(chan uint64, 2)
	release := make(chan struct{})
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			fn.(func(func()))(func() {
				entered <- gid.Get()
				<-release
			})
		})
	}
	ids := map[uint64]bool{<-entered: true, <-entered: true}
	select {
	case <-ended:
		t.Error("waiting invocation reported completion")
	default:
	}
	close(release)
	wg.Wait()
	for range 2 {
		id := <-ended
		if !ids[id] {
			t.Fatalf("unexpected completion for goroutine %d", id)
		}
		delete(ids, id)
	}
}
