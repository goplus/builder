package main

import (
	"reflect"
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

func newTrackedInterp(t *testing.T, tracker *executionTracker) *ixgo.Interp {
	t.Helper()
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
	tracker := newExecutionTracker(func(locations []executionLocation) {
		if len(locations) != 0 {
			return
		}
		if gid.Get() != owner {
			t.Error("completion ran on a different goroutine")
		}
		ended++
	})
	i := newTrackedInterp(t, tracker)
	check := func() {
		tracker.report("Sprite.spx", 3)
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
		tracker.report("Sprite.spx", 5)
		if ended != 1 {
			t.Error("completion preceded interpreted defer")
		}
	})
	if err == nil || ended != 2 {
		t.Fatalf("panic: err=%v, completions=%d; want error and 2", err, ended)
	}
	if _, err := i.RunFunc("Wait", func() { tracker.report("Sprite.spx", 3) }); err != nil {
		t.Fatal(err)
	}
	if ended != 3 {
		t.Fatal("subsequent invocation did not finish independently")
	}
}

func TestExecutionTrackerConcurrentCallbacks(t *testing.T) {
	snapshots := make(chan []executionLocation, 4)
	tracker := newExecutionTracker(func(locations []executionLocation) { snapshots <- locations })
	i := newTrackedInterp(t, tracker)
	fn, ok := i.GetFunc("Wait")
	if !ok {
		t.Fatal("missing function")
	}
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	var wg sync.WaitGroup
	for _, file := range []string{"Sprite.spx", "main.spx"} {
		wg.Go(func() {
			fn.(func(func()))(func() {
				tracker.report(file, 3)
				entered <- struct{}{}
				<-release
			})
		})
	}
	<-entered
	<-entered
	first, both := <-snapshots, <-snapshots
	if len(first) != 1 || len(both) != 2 {
		t.Fatalf("expected one then two active positions, got %v and %v", first, both)
	}
	files := map[string]bool{}
	for _, location := range both {
		files[location.File] = true
	}
	if !files["Sprite.spx"] || !files["main.spx"] {
		t.Fatalf("missing concurrent positions: %v", both)
	}
	close(release)
	wg.Wait()
	remaining, empty := <-snapshots, <-snapshots
	if len(remaining) != 1 || len(empty) != 0 || empty == nil {
		t.Fatalf("expected one then an empty array after completion, got %v and %v", remaining, empty)
	}
	if len(both) != 2 {
		t.Fatal("later updates mutated an earlier snapshot")
	}
}

func TestExecutionTrackerReportsLocationChanges(t *testing.T) {
	var snapshots [][]executionLocation
	tracker := newExecutionTracker(func(locations []executionLocation) {
		snapshots = append(snapshots, locations)
	})
	i := newTrackedInterp(t, tracker)
	want := [][]executionLocation{
		{{File: "Sprite.spx", Line: 3}},
		{{File: "Sprite.spx", Line: 4}},
		{{File: "Other.spx", Line: 4}},
		{},
	}
	for range 2 {
		snapshots = nil
		_, err := i.RunFunc("Wait", func() {
			for _, location := range want[:3] {
				tracker.report(location[0].File, location[0].Line)
				tracker.report(location[0].File, location[0].Line)
			}
		})
		if err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(snapshots, want) {
			t.Fatalf("snapshots = %v; want %v", snapshots, want)
		}
	}
}
