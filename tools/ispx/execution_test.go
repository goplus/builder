package main

import (
	"go/token"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/goplus/ixgo"
)

const executionSource = `package main
//line Sprite.spx:1
func Nested(invoke func(func()), check func()) {
 invoke(func() {
  check()
 })
 check()
}
//line Sprite.spx:10
func Panic(check func()) { defer check(); panic("cancelled") }
//line Sprite.spx:20
func Recovered(check func()) {
 defer func() { recover() }()
 Panic(check)
 check()
}
//line Sprite.spx:30
func Wait(wait func()) { wait() }
//line Sprite.spx:40
func Loop(n int) int { s := 0; for i := 0; i < n; i++ { s += i }; return s }
//line generated.go:1
func Generated() { n := 1; _ = n }
`

func newTrackedInterp(t *testing.T, onChange func([]executionLocation)) (*ixgo.Interp, *ixgo.ExecutionTracker) {
	t.Helper()
	ctx := ixgo.NewContext(ixgo.SupportMultipleInterp | ixgo.EnableCachedReg)
	tracker := newExecutionTracker(onChange)
	t.Cleanup(tracker.Close)
	ctx.SetExecutionTracker(tracker)
	i, err := ctx.LoadInterp("execution.go", executionSource)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(i.UnsafeRelease)
	return i, tracker
}

func TestExecutionTrackerRestoresCallerAfterHostCallback(t *testing.T) {
	var snapshots [][]executionLocation
	i, _ := newTrackedInterp(t, func(locations []executionLocation) { snapshots = append(snapshots, locations) })
	calls := 0
	check := func() {
		calls++
		want := 3
		if calls == 2 {
			want = 5
		}
		if got := snapshots[len(snapshots)-1]; !reflect.DeepEqual(got, []executionLocation{{File: "Sprite.spx", Line: want}}) {
			t.Fatalf("check %d: locations = %v; want line %d", calls, got, want)
		}
	}
	_, err := i.RunFunc("Nested", func(f func()) {
		f()
		if got := snapshots[len(snapshots)-1]; !reflect.DeepEqual(got, []executionLocation{{File: "Sprite.spx", Line: 2}}) {
			t.Fatalf("callback return did not restore caller: %v", got)
		}
	}, check)
	if err != nil {
		t.Fatal(err)
	}
	if calls != 2 || len(snapshots[len(snapshots)-1]) != 0 {
		t.Fatalf("calls=%d, snapshots=%v", calls, snapshots)
	}
	for _, snapshot := range snapshots[:len(snapshots)-1] {
		if len(snapshot) == 0 {
			t.Fatal("nested return cleared outer invocation")
		}
	}
}

func TestExecutionTrackerConcurrentCallbacks(t *testing.T) {
	snapshots := make(chan []executionLocation, 16)
	i, _ := newTrackedInterp(t, func(locations []executionLocation) { snapshots <- locations })
	fn, ok := i.GetFunc("Wait")
	if !ok {
		t.Fatal("missing function")
	}
	entered := make(chan struct{}, 2)
	releases := []chan struct{}{make(chan struct{}), make(chan struct{})}
	var wg sync.WaitGroup
	for _, release := range releases {
		wg.Go(func() {
			fn.(func(func()))(func() { entered <- struct{}{}; <-release })
		})
	}
	t.Cleanup(func() {
		for _, release := range releases {
			select {
			case <-release:
			default:
				close(release)
			}
		}
		wg.Wait()
	})
	receive := func() []executionLocation {
		t.Helper()
		select {
		case snapshot := <-snapshots:
			return snapshot
		case <-time.After(5 * time.Second):
			t.Fatal("timed out waiting for snapshot")
			return nil
		}
	}
	for range 2 {
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("handler did not start")
		}
	}
	first, both := receive(), receive()
	if len(first) != 1 || len(both) != 2 || both[0] != both[1] {
		t.Fatalf("same-line handlers must remain independent: %v, %v", first, both)
	}
	close(releases[0])
	if remaining := receive(); len(remaining) != 1 {
		t.Fatalf("one handler should remain: %v", remaining)
	}
	close(releases[1])
	if empty := receive(); empty == nil || len(empty) != 0 {
		t.Fatalf("expected empty array: %v", empty)
	}
	wg.Wait()
	if len(both) != 2 {
		t.Fatal("later updates mutated an earlier snapshot")
	}
}

func TestExecutionTrackerUnwinding(t *testing.T) {
	for _, name := range []string{"Panic", "Recovered"} {
		t.Run(name, func(t *testing.T) {
			var snapshots [][]executionLocation
			i, _ := newTrackedInterp(t, func(locations []executionLocation) { snapshots = append(snapshots, locations) })
			called := false
			_, err := i.RunFunc(name, func() {
				called = true
				if len(snapshots[len(snapshots)-1]) == 0 {
					t.Error("location cleared before user defer")
				}
			})
			if !called || (err != nil) != (name == "Panic") {
				t.Fatalf("called=%v, err=%v", called, err)
			}
			if len(snapshots[len(snapshots)-1]) != 0 {
				t.Fatalf("stale positions after unwind: %v", snapshots)
			}
			for _, snapshot := range snapshots[:len(snapshots)-1] {
				if len(snapshot) == 0 {
					t.Fatal("nested unwind cleared outer invocation")
				}
			}
		})
	}
}

func TestExecutionTrackerDeduplicationAndSubsequentInvocations(t *testing.T) {
	var snapshots [][]executionLocation
	i, _ := newTrackedInterp(t, func(locations []executionLocation) { snapshots = append(snapshots, locations) })
	for range 2 {
		snapshots = nil
		if result, err := i.RunFunc("Loop", 10); err != nil || result != 45 {
			t.Fatalf("result=%v, err=%v", result, err)
		}
		want := [][]executionLocation{{{File: "Sprite.spx", Line: 40}}, {}}
		if !reflect.DeepEqual(snapshots, want) {
			t.Fatalf("snapshots=%v; want %v", snapshots, want)
		}
	}
	snapshots = nil
	if _, err := i.RunFunc("Generated"); err != nil {
		t.Fatal(err)
	}
	if len(snapshots) != 0 {
		t.Fatalf("generated Go locations leaked: %v", snapshots)
	}
}

func TestExecutionTrackerCloseWhileWaiting(t *testing.T) {
	var snapshots [][]executionLocation
	i, tracker := newTrackedInterp(t, func(locations []executionLocation) { snapshots = append(snapshots, locations) })
	_, err := i.RunFunc("Wait", func() {
		if len(snapshots[len(snapshots)-1]) != 1 {
			t.Fatal("waiting handler lost its position")
		}
		tracker.Close()
		if last := snapshots[len(snapshots)-1]; last == nil || len(last) != 0 {
			t.Fatalf("close did not clear locations: %v", last)
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	before := len(snapshots)
	if _, err := i.RunFunc("Loop", 2); err != nil {
		t.Fatal(err)
	}
	if len(snapshots) != before {
		t.Fatal("closed tracker reported new positions")
	}
}

func TestExecutionLocationsIgnoresDelayedEvents(t *testing.T) {
	var snapshots [][]executionLocation
	locations := &executionLocations{
		lastSequence: make(map[uint64]uint64),
		locations:    make(map[uint64]executionLocation),
		onChange:     func(snapshot []executionLocation) { snapshots = append(snapshots, snapshot) },
	}
	report := func(id, sequence uint64, line int) {
		locations.report(ixgo.ExecutionPosition{GoroutineID: id, Sequence: sequence, Clear: line == 0,
			Position: token.Position{Filename: "Sprite.spx", Line: line}})
	}
	report(1, 2, 3)
	report(1, 1, 4)
	report(1, 3, 3)
	report(1, 5, 0)
	report(1, 4, 9)
	report(2, 7, 0)
	report(2, 6, 3)
	report(1, 8, 3)
	report(1, 9, 0)
	want := [][]executionLocation{{{File: "Sprite.spx", Line: 3}}, {}, {{File: "Sprite.spx", Line: 3}}, {}}
	if !reflect.DeepEqual(snapshots, want) {
		t.Fatalf("snapshots=%v; want %v", snapshots, want)
	}
}
