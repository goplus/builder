package main

import (
	"testing"
	"time"
)

func TestLocationReporterCoalescesAndDeduplicates(t *testing.T) {
	type location struct {
		file string
		line int
	}
	locations := make(chan location, 2)
	reporter := newLocationReporter(20*time.Millisecond, func(file string, line int) {
		locations <- location{file, line}
	})
	now := time.Now()
	reporter.report("Sprite.spx", 1, now)
	reporter.report("Sprite.spx", 1, now)
	reporter.report("Sprite.spx", 2, now.Add(time.Millisecond))
	reporter.report("Sprite.spx", 3, now.Add(2*time.Millisecond))

	if got := <-locations; got != (location{"Sprite.spx", 1}) {
		t.Fatalf("first location = %+v", got)
	}
	select {
	case got := <-locations:
		if got != (location{"Sprite.spx", 3}) {
			t.Fatalf("last location = %+v", got)
		}
	case <-time.After(time.Second):
		t.Fatal("pending location was not emitted")
	}
}
