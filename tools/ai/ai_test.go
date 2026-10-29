package ai

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestPlayerOnCmd(t *testing.T) {
	type CommandWithANameThatIsLongerThanSixtyFourCharactersAndCannotBeRegistered struct{}
	type commandWithLongParameterName struct {
		ParameterWithANameThatIsLongerThanSixtyFourCharactersAndCannotBeRegistered string
	}
	type commandWithPointerParameter struct {
		Value *string
	}

	for _, tt := range []struct {
		name          string
		cmd           any
		handler       any
		wantPanicText string
	}{
		{
			name: "LongCommandName",
			cmd:  CommandWithANameThatIsLongerThanSixtyFourCharactersAndCannotBeRegistered{},
			handler: func(CommandWithANameThatIsLongerThanSixtyFourCharactersAndCannotBeRegistered) error {
				return nil
			},
			wantPanicText: "must not exceed 64 characters",
		},
		{
			name:          "LongParameterName",
			cmd:           commandWithLongParameterName{},
			handler:       func(commandWithLongParameterName) error { return nil },
			wantPanicText: "invalid name",
		},
		{
			name:          "UnsupportedParameterType",
			cmd:           commandWithPointerParameter{},
			handler:       func(commandWithPointerParameter) error { return nil },
			wantPanicText: "unsupported type *string",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				panicValue := recover()
				if panicValue == nil {
					t.Fatal("expected panic")
				}
				if got := fmt.Sprint(panicValue); !strings.Contains(got, tt.wantPanicText) {
					t.Errorf("got panic %q, want panic containing %q", got, tt.wantPanicText)
				}
			}()
			PlayerOnCmd_(&Player{}, tt.cmd, tt.handler)
		})
	}

	t.Run("TooManyCommands", func(t *testing.T) {
		type extraCommand struct{}

		p := &Player{commands: make(map[string]commandInfo, maxCommandCount)}
		for i := range maxCommandCount {
			p.commands[fmt.Sprintf("Command%d", i)] = commandInfo{}
		}

		defer func() {
			panicValue := recover()
			if panicValue == nil {
				t.Fatal("expected panic")
			}
			if got := fmt.Sprint(panicValue); got != "cannot register more than 128 AI commands" {
				t.Errorf("got panic %q, want command count error", got)
			}
		}()
		PlayerOnCmd_(p, extraCommand{}, func(extraCommand) error { return nil })
	})
}

func TestPlayerThink(t *testing.T) {
	t.Run("RejectsInvalidInitialRequestBeforeTransport", func(t *testing.T) {
		type testCommand struct{}

		for _, tt := range []struct {
			name            string
			message         string
			registerCommand bool
			wantError       string
		}{
			{
				name:            "MissingContent",
				registerCommand: true,
				wantError:       "missing content",
			},
			{
				name:            "ContentTooLong",
				message:         strings.Repeat(string(rune(0x4e00)), 281),
				registerCommand: true,
				wantError:       "content length exceeds 280 characters",
			},
			{
				name:      "NoCommands",
				message:   "move",
				wantError: "no available commands",
			},
		} {
			t.Run(tt.name, func(t *testing.T) {
				originalTransport := DefaultTransport()
				t.Cleanup(func() { SetDefaultTransport(originalTransport) })

				transportCalls := 0
				SetDefaultTransport(&mockTransport{
					InteractFunc: func(_ context.Context, _ Request) (Response, error) {
						transportCalls++
						return Response{}, nil
					},
				})

				var gotErr error
				p := &Player{errorHandler: func(err error) { gotErr = err }}
				if tt.registerCommand {
					PlayerOnCmd_(p, testCommand{}, func(testCommand) error { return nil })
				}

				p.think(t.Context(), nil, tt.message, nil)

				if gotErr == nil || gotErr.Error() != tt.wantError {
					t.Errorf("got error %v, want %q", gotErr, tt.wantError)
				}
				if transportCalls != 0 {
					t.Errorf("got %d transport calls, want 0", transportCalls)
				}
			})
		}
	})

	t.Run("RejectsEmptyInitialResponse", func(t *testing.T) {
		type testCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		transportCalls := 0
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, _ Request) (Response, error) {
				transportCalls++
				return Response{}, nil
			},
		})

		var gotErr error
		p := &Player{errorHandler: func(err error) { gotErr = err }}
		PlayerOnCmd_(p, testCommand{}, func(testCommand) error { return nil })

		p.think(t.Context(), nil, "move", nil)

		if got, want := transportCalls, 1; got != want {
			t.Errorf("got %d transport calls, want %d", got, want)
		}
		if gotErr == nil || gotErr.Error() != "ai did not provide a command for the initial turn" {
			t.Errorf("got error %v, want initial command error", gotErr)
		}
	})

	t.Run("SortsCommandSpecsByName", func(t *testing.T) {
		type AlphaCommand struct{}
		type MiddleCommand struct{}
		type ZuluCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		interactCalls := 0
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, req Request) (Response, error) {
				interactCalls++
				var gotNames []string
				for _, spec := range req.CommandSpecs {
					gotNames = append(gotNames, spec.Name)
				}
				wantNames := []string{"AlphaCommand", "MiddleCommand", "ZuluCommand"}
				if !slices.Equal(gotNames, wantNames) {
					t.Errorf("got command names %v, want %v", gotNames, wantNames)
				}
				if interactCalls == 1 {
					return Response{CommandName: "AlphaCommand"}, nil
				}
				return Response{}, nil
			},
		})

		p := &Player{errorHandler: func(err error) { t.Errorf("unexpected interaction error: %v", err) }}
		PlayerOnCmd_(p, ZuluCommand{}, func(ZuluCommand) error { return nil })
		PlayerOnCmd_(p, AlphaCommand{}, func(AlphaCommand) error { return nil })
		PlayerOnCmd_(p, MiddleCommand{}, func(MiddleCommand) error { return nil })

		p.think(t.Context(), nil, "move", nil)

		if got, want := interactCalls, 2; got != want {
			t.Errorf("got %d interaction calls, want %d", got, want)
		}
	})

	t.Run("DoesNotRetryOrdinaryTransportError", func(t *testing.T) {
		type testCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		transportCalls := 0
		baseErr := errors.New("forbidden")
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, _ Request) (Response, error) {
				transportCalls++
				return Response{}, baseErr
			},
		})

		var gotErr error
		p := &Player{errorHandler: func(err error) { gotErr = err }}
		PlayerOnCmd_(p, testCommand{}, func(testCommand) error { return nil })

		p.think(t.Context(), nil, "move", nil)

		if got, want := transportCalls, 1; got != want {
			t.Errorf("got %d transport calls, want %d", got, want)
		}
		if gotErr == nil || !errors.Is(gotErr, baseErr) {
			t.Errorf("got error %v, want error wrapping %v", gotErr, baseErr)
		}
	})

	t.Run("RetriesExplicitlyRetryableTransportError", func(t *testing.T) {
		type testCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		transportCalls := 0
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, _ Request) (Response, error) {
				transportCalls++
				switch transportCalls {
				case 1:
					return Response{}, &RetryableError{Err: errors.New("unavailable")}
				case 2:
					return Response{CommandName: reflect.TypeOf(testCommand{}).Name()}, nil
				default:
					return Response{}, nil
				}
			},
		})

		p := &Player{errorHandler: func(err error) { t.Errorf("unexpected interaction error: %v", err) }}
		PlayerOnCmd_(p, testCommand{}, func(testCommand) error { return nil })

		p.think(t.Context(), nil, "move", nil)

		if got, want := transportCalls, 3; got != want {
			t.Errorf("got %d transport calls, want %d", got, want)
		}
	})

	t.Run("ArchivesAfterNormalCompletion", func(t *testing.T) {
		type archiveCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		interactCalls := 0
		archivedTurnCount := make(chan int, 1)
		archiveMayFinish := make(chan struct{})
		var releaseArchiveOnce sync.Once
		releaseArchive := func() {
			releaseArchiveOnce.Do(func() { close(archiveMayFinish) })
		}
		t.Cleanup(releaseArchive)
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, _ Request) (Response, error) {
				interactCalls++
				if interactCalls == 1 {
					return Response{CommandName: reflect.TypeOf(archiveCommand{}).Name()}, nil
				}
				return Response{}, nil
			},
			ArchiveFunc: func(_ context.Context, turns []Turn, _ string) (ArchivedHistory, error) {
				archivedTurnCount <- len(turns)
				<-archiveMayFinish
				return ArchivedHistory{Content: "archived"}, nil
			},
		})

		// The new command turn brings history to the 30-turn threshold. Retaining at
		// least 15 turns makes index 10 the latest eligible interaction boundary.
		history := make([]Turn, 29)
		for i := range history {
			history[i].IsInitial = i%10 == 0
		}
		p := &Player{
			errorHandler: func(err error) { t.Errorf("unexpected interaction error: %v", err) },
			history:      history,
		}
		PlayerOnCmd_(p, archiveCommand{}, func(archiveCommand) error { return nil })

		ctx, cancel := context.WithCancel(t.Context())
		p.think(ctx, nil, "move", nil)

		select {
		case got := <-archivedTurnCount:
			if want := 10; got != want {
				t.Errorf("got %d archived turns, want %d", got, want)
			}
		case <-time.After(time.Second):
			t.Fatal("archive was not called after normal completion")
		}
		cancel()
		releaseArchive()

		deadline := time.Now().Add(time.Second)
		for {
			p.mu.RLock()
			gotArchivedHistory := p.archivedHistory
			gotHistoryLength := len(p.history)
			p.mu.RUnlock()

			if gotArchivedHistory == "archived" && gotHistoryLength == 20 {
				break
			}
			if time.Now().After(deadline) {
				t.Fatalf("archive was not applied: archived history %q, history length %d", gotArchivedHistory, gotHistoryLength)
			}
			time.Sleep(time.Millisecond)
		}
	})

	t.Run("ReportsTurnLimit", func(t *testing.T) {
		type loopCommand struct{}

		originalTransport := DefaultTransport()
		t.Cleanup(func() { SetDefaultTransport(originalTransport) })

		interactCalls := 0
		SetDefaultTransport(&mockTransport{
			InteractFunc: func(_ context.Context, req Request) (Response, error) {
				if got, want := req.ContinuationTurn, interactCalls; got != want {
					t.Errorf("got continuation turn %d, want %d", got, want)
				}
				interactCalls++
				return Response{CommandName: reflect.TypeOf(loopCommand{}).Name()}, nil
			},
		})

		errorCh := make(chan error, 1)
		p := &Player{errorHandler: func(err error) { errorCh <- err }}
		PlayerOnCmd_(p, loopCommand{}, func(loopCommand) error { return nil })

		p.think(t.Context(), nil, "loop", nil)

		if got, want := interactCalls, 20; got != want {
			t.Errorf("got %d interaction calls, want %d", got, want)
		}
		select {
		case err := <-errorCh:
			if got, want := err.Error(), "ai interaction did not complete within 20 turns"; got != want {
				t.Errorf("got error %q, want %q", got, want)
			}
		default:
			t.Fatal("turn limit did not trigger error handler")
		}
	})
}

func TestPlayerManageHistoryDoesNotRetryOrdinaryTransportError(t *testing.T) {
	originalTransport := DefaultTransport()
	t.Cleanup(func() { SetDefaultTransport(originalTransport) })

	archiveCalls := 0
	SetDefaultTransport(&mockTransport{
		ArchiveFunc: func(_ context.Context, _ []Turn, _ string) (ArchivedHistory, error) {
			archiveCalls++
			return ArchivedHistory{}, errors.New("forbidden")
		},
	})

	history := make([]Turn, 35)
	for i := range history {
		history[i].IsInitial = i%10 == 0
	}
	p := &Player{history: history}

	p.manageHistory(t.Context())

	if got, want := archiveCalls, 1; got != want {
		t.Errorf("got %d archive calls, want %d", got, want)
	}
	if p.archiveInProgress {
		t.Error("archive remained in progress after a non-retryable error")
	}
	if got, want := len(p.history), len(history); got != want {
		t.Errorf("got %d history turns, want %d", got, want)
	}
}

func TestPlayerManageHistoryDefersClientErrorRetry(t *testing.T) {
	originalTransport := DefaultTransport()
	t.Cleanup(func() { SetDefaultTransport(originalTransport) })

	archiveCalls := 0
	SetDefaultTransport(&mockTransport{
		ArchiveFunc: func(_ context.Context, _ []Turn, _ string) (ArchivedHistory, error) {
			archiveCalls++
			return ArchivedHistory{}, &ClientError{
				StatusCode: 403,
				RetryAfter: time.Hour,
				Err:        errors.New("quota exceeded"),
			}
		},
	})

	history := make([]Turn, 35)
	for i := range history {
		history[i].IsInitial = i%10 == 0
	}
	p := &Player{history: history}

	p.manageHistory(t.Context())
	p.manageHistory(t.Context())

	if got, want := archiveCalls, 1; got != want {
		t.Errorf("got %d archive calls, want %d", got, want)
	}
	if !p.archiveRetryAt.After(time.Now()) {
		t.Errorf("got archive retry time %v, want a future time", p.archiveRetryAt)
	}
}

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
		for i := range numGoroutines {
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
		for i := range count {
			history[i] = Turn{
				RequestContent: string(rune('a' + i%26)),
			}
			if slices.Contains(initialPattern, i) {
				history[i].IsInitial = true
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
		{
			name:                  "CapsBatchAtBackendLimit",
			history:               makeHistory(100, []int{0, 10, 20, 30, 40, 50, 60, 70, 80, 90}),
			wantTurnsCount:        50,
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
		for i := range 35 {
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
		for i := range 40 {
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

		// History should contain no empty turns.
		for i, turn := range p.history {
			if turn.RequestContent == "" && turn.ResponseCommandName == "" && !turn.IsInitial {
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
		for i := range 35 {
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
