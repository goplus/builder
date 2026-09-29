package main

import (
	"reflect"
	"testing"
	"time"
)

func TestLocationReporterEmitsLatestLineOnNextCallback(t *testing.T) {
	var locations []int
	reporter := newLocationReporter(33*time.Millisecond, func(_ string, line int) {
		locations = append(locations, line)
	})
	start := time.Unix(0, 0)
	reporter.report("Squirrel.spx", 1, start)
	reporter.report("Squirrel.spx", 2, start.Add(10*time.Millisecond))
	reporter.report("Squirrel.spx", 2, start.Add(34*time.Millisecond))
	reporter.report("Squirrel.spx", 2, start.Add(68*time.Millisecond))
	if want := []int{1, 2}; !reflect.DeepEqual(locations, want) {
		t.Fatalf("locations = %v, want %v", locations, want)
	}
}
