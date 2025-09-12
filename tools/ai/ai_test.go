package ai

import (
	"reflect"
	"sync"
	"testing"
)

func TestPlayerAppendHistory(t *testing.T) {
	for _, tt := range []struct {
		name           string
		initialHistory []Turn
		turnToAppend   Turn
		wantLength     int
	}{
		{
			name:           "EmptyHistory",
			initialHistory: nil,
			turnToAppend: Turn{
				RequestContent: "hello",
				ResponseText:   "world",
				IsInitial:      true,
			},
			wantLength: 1,
		},
		{
			name: "ExistingHistory",
			initialHistory: []Turn{
				{RequestContent: "first", IsInitial: true},
				{RequestContent: "second"},
			},
			turnToAppend: Turn{
				RequestContent: "third",
			},
			wantLength: 3,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			p := &Player{
				history: tt.initialHistory,
			}

			p.appendHistory(tt.turnToAppend)

			if got, want := len(p.history), tt.wantLength; got != want {
				t.Errorf("got %d, want %d", got, want)
			}

			lastTurn := p.history[len(p.history)-1]
			if got, want := lastTurn.RequestContent, tt.turnToAppend.RequestContent; got != want {
				t.Errorf("got %q, want %q", got, want)
			}
		})
	}

	t.Run("ConcurrentAppend", func(t *testing.T) {
		p := &Player{}
		const numGoroutines = 100

		var wg sync.WaitGroup
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func(idx int) {
				defer wg.Done()
				p.appendHistory(Turn{
					RequestContent: string(rune('a' + idx%26)),
				})
			}(i)
		}
		wg.Wait()

		if got, want := len(p.history), numGoroutines; got != want {
			t.Errorf("got %d, want %d", got, want)
		}
	})
}

func TestPlayerPrepareArchive(t *testing.T) {
	makeHistory := func(count int, initialPattern []int) []Turn {
		history := make([]Turn, count)
		for i := 0; i < count; i++ {
			history[i] = Turn{
				RequestContent: string(rune('a' + i%26)),
			}
			for _, pos := range initialPattern {
				if i == pos {
					history[i].IsInitial = true
					break
				}
			}
		}
		return history
	}

	for _, tt := range []struct {
		name                  string
		history               []Turn
		archivedHistory       string
		archiveInProgress     bool
		wantTurnsCount        int
		wantExistingArchive   string
		wantArchiveInProgress bool
	}{
		{
			name:                  "BelowThreshold",
			history:               makeHistory(20, []int{0, 10}),
			archivedHistory:       "previous",
			wantTurnsCount:        0,
			wantExistingArchive:   "",
			wantArchiveInProgress: false,
		},
		{
			name:                  "AlreadyInProgress",
			history:               makeHistory(35, []int{0, 10, 20, 30}),
			archiveInProgress:     true,
			wantTurnsCount:        0,
			wantExistingArchive:   "",
			wantArchiveInProgress: true,
		},
		{
			name:                  "NotEnoughToRetain",
			history:               makeHistory(15, []int{0}),
			wantTurnsCount:        0,
			wantExistingArchive:   "",
			wantArchiveInProgress: false,
		},
		{
			name:                  "NoSequenceBoundary",
			history:               makeHistory(35, []int{0}),
			wantTurnsCount:        0,
			wantExistingArchive:   "",
			wantArchiveInProgress: false,
		},
		{
			name:                  "SingleBoundary",
			history:               makeHistory(35, []int{0, 10}),
			archivedHistory:       "existing",
			wantTurnsCount:        10,
			wantExistingArchive:   "existing",
			wantArchiveInProgress: true,
		},
		{
			name:                  "MultipleBoundaries",
			history:               makeHistory(40, []int{0, 5, 15, 25, 35}),
			archivedHistory:       "old",
			wantTurnsCount:        15,
			wantExistingArchive:   "old",
			wantArchiveInProgress: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			p := &Player{
				history:           tt.history,
				archivedHistory:   tt.archivedHistory,
				archiveInProgress: tt.archiveInProgress,
			}

			turns, existingArchive := p.prepareArchive()

			if got, want := len(turns), tt.wantTurnsCount; got != want {
				t.Errorf("got %d, want %d", got, want)
			}

			if got, want := existingArchive, tt.wantExistingArchive; got != want {
				t.Errorf("got %q, want %q", got, want)
			}

			if got, want := p.archiveInProgress, tt.wantArchiveInProgress; got != want {
				t.Errorf("got %v, want %v", got, want)
			}

			// Verify turns are correctly cloned (not sharing underlying array).
			if len(turns) > 0 {
				// Modify the returned slice.
				turns[0].RequestContent = "modified"
				// Original should be unchanged.
				if p.history[0].RequestContent == "modified" {
					t.Error("returned turns share underlying array with history")
				}
			}
		})
	}

	t.Run("CompleteWorkflow", func(t *testing.T) {
		p := &Player{}

		// Build history with clear boundaries.
		for i := 0; i < 35; i++ {
			p.appendHistory(Turn{
				RequestContent: string(rune('a' + i%26)),
				IsInitial:      i%10 == 0,
			})
		}

		// Phase 1: Prepare.
		turns, existingArchive := p.prepareArchive()
		if turns == nil {
			t.Fatal("expected successful prepare")
		}
		if existingArchive != "" {
			t.Errorf("expected empty existingArchive, got %q", existingArchive)
		}
		if !p.archiveInProgress {
			t.Error("expected archiveInProgress to be true after prepare")
		}

		originalTurnCount := len(turns)

		// Phase 2: Apply.
		p.applyArchive("archived_content", originalTurnCount)

		if got, want := p.archivedHistory, "archived_content"; got != want {
			t.Errorf("got %q, want %q", got, want)
		}
		if got, want := len(p.history), 35-originalTurnCount; got != want {
			t.Errorf("got %d, want %d", got, want)
		}
		if p.archiveInProgress {
			t.Error("expected archiveInProgress to be false after apply")
		}

		// Phase 3: Second prepare should fail (not enough turns).
		turns2, _ := p.prepareArchive()
		if turns2 != nil {
			t.Error("second prepare should return nil (not enough turns)")
		}
	})

	t.Run("ConcurrentOperations", func(t *testing.T) {
		p := &Player{}

		// Build history.
		for i := 0; i < 40; i++ {
			p.history = append(p.history, Turn{
				RequestContent: string(rune('a' + i%26)),
				IsInitial:      i%10 == 0,
			})
		}

		var wg sync.WaitGroup
		wg.Add(3)

		// Concurrent operations.
		go func() {
			defer wg.Done()
			p.appendHistory(Turn{RequestContent: "concurrent1"})
		}()

		go func() {
			defer wg.Done()
			turns, _ := p.prepareArchive()
			if turns != nil {
				p.applyArchive("concurrent_archive", len(turns))
			}
		}()

		go func() {
			defer wg.Done()
			p.appendHistory(Turn{RequestContent: "concurrent2"})
		}()

		wg.Wait()

		// Verify consistency - no panics and valid state.
		if p.archiveInProgress {
			// If still in progress, cancel should work.
			p.cancelArchive()
			if p.archiveInProgress {
				t.Error("cancelArchive failed to reset flag")
			}
		}

		// History should be valid (no nil entries).
		for i, turn := range p.history {
			if turn.RequestContent == "" && !turn.IsInitial && turn.ResponseText == "" {
				t.Errorf("invalid turn at index %d", i)
			}
		}
	})
}

func TestPlayerApplyArchive(t *testing.T) {
	for _, tt := range []struct {
		name                  string
		initialHistory        []Turn
		initialArchived       string
		initialInProgress     bool
		newArchived           string
		turnCount             int
		wantRemainingCount    int
		wantArchived          string
		wantArchiveInProgress bool
	}{
		{
			name: "Basic",
			initialHistory: []Turn{
				{RequestContent: "a"},
				{RequestContent: "b"},
				{RequestContent: "c"},
				{RequestContent: "d"},
				{RequestContent: "e"},
			},
			initialArchived:       "old",
			initialInProgress:     true,
			newArchived:           "new",
			turnCount:             3,
			wantRemainingCount:    2,
			wantArchived:          "new",
			wantArchiveInProgress: false,
		},
		{
			name: "ArchiveAll",
			initialHistory: []Turn{
				{RequestContent: "x"},
				{RequestContent: "y"},
			},
			initialInProgress:     true,
			newArchived:           "all",
			turnCount:             2,
			wantRemainingCount:    0,
			wantArchived:          "all",
			wantArchiveInProgress: false,
		},
		{
			name: "ArchiveNone",
			initialHistory: []Turn{
				{RequestContent: "keep1"},
				{RequestContent: "keep2"},
			},
			initialArchived:       "unchanged",
			initialInProgress:     true,
			newArchived:           "empty",
			turnCount:             0,
			wantRemainingCount:    2,
			wantArchived:          "empty",
			wantArchiveInProgress: false,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			p := &Player{
				history:           tt.initialHistory,
				archivedHistory:   tt.initialArchived,
				archiveInProgress: tt.initialInProgress,
			}

			p.applyArchive(tt.newArchived, tt.turnCount)

			if got, want := len(p.history), tt.wantRemainingCount; got != want {
				t.Errorf("got %d, want %d", got, want)
			}

			if got, want := p.archivedHistory, tt.wantArchived; got != want {
				t.Errorf("got %q, want %q", got, want)
			}

			if got, want := p.archiveInProgress, tt.wantArchiveInProgress; got != want {
				t.Errorf("got %v, want %v", got, want)
			}

			// Verify correct turns remain.
			if tt.turnCount > 0 && len(p.history) > 0 {
				firstRemaining := p.history[0].RequestContent
				expectedFirst := tt.initialHistory[tt.turnCount].RequestContent
				if got, want := firstRemaining, expectedFirst; got != want {
					t.Errorf("got %q, want %q", got, want)
				}
			}
		})
	}
}

func TestPlayerCancelArchive(t *testing.T) {
	for _, tt := range []struct {
		name                  string
		initialInProgress     bool
		initialArchived       string
		initialHistory        []Turn
		wantArchiveInProgress bool
	}{
		{
			name:                  "CancelInProgress",
			initialInProgress:     true,
			initialArchived:       "keep",
			initialHistory:        []Turn{{RequestContent: "a"}},
			wantArchiveInProgress: false,
		},
		{
			name:                  "CancelNotInProgress",
			initialInProgress:     false,
			initialArchived:       "unchanged",
			initialHistory:        []Turn{{RequestContent: "b"}},
			wantArchiveInProgress: false,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			p := &Player{
				archiveInProgress: tt.initialInProgress,
				archivedHistory:   tt.initialArchived,
				history:           tt.initialHistory,
			}

			originalHistory := make([]Turn, len(p.history))
			copy(originalHistory, p.history)

			p.cancelArchive()

			if got, want := p.archiveInProgress, tt.wantArchiveInProgress; got != want {
				t.Errorf("got %v, want %v", got, want)
			}

			// Verify other fields unchanged.
			if got, want := p.archivedHistory, tt.initialArchived; got != want {
				t.Errorf("archivedHistory changed: got %q, want %q", got, want)
			}

			if got, want := p.history, originalHistory; !reflect.DeepEqual(got, want) {
				t.Errorf("history changed: got %v, want %v", got, want)
			}
		})
	}

	t.Run("CancelWorkflow", func(t *testing.T) {
		p := &Player{}

		// Build history.
		for i := 0; i < 35; i++ {
			p.appendHistory(Turn{
				RequestContent: string(rune('a' + i%26)),
				IsInitial:      i%10 == 0,
			})
		}

		// Prepare.
		turns, _ := p.prepareArchive()
		if turns == nil {
			t.Fatal("expected successful prepare")
		}

		originalHistoryLen := len(p.history)

		// Cancel instead of apply.
		p.cancelArchive()

		if p.archiveInProgress {
			t.Error("expected archiveInProgress to be false after cancel")
		}
		if got, want := len(p.history), originalHistoryLen; got != want {
			t.Errorf("history length changed after cancel: got %d, want %d", got, want)
		}

		// Should be able to prepare again.
		turns2, _ := p.prepareArchive()
		if turns2 == nil {
			t.Error("should be able to prepare again after cancel")
		}
	})
}
