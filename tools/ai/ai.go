// Package ai provides a simple API for AI interactions in XBuilder games.
//
// This package is designed for children around 10 years old who are learning
// programming. It provides a minimalist API to integrate AI capabilities into
// games without requiring understanding of complex networking, error handling,
// or AI model details.
package ai

import (
	"cmp"
	stdContext "context"
	"errors"
	"fmt"
	"log"
	"reflect"
	"slices"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/goplus/spx/v3/pkg/spx"
)

// GopPackage indicates that this package is a XGo package.
const GopPackage = true

// Break is a special error that signals the current AI interaction sequence should be terminated.
var Break = errors.New("break interaction")

// Player represents an AI agent capable of interacting with the game. Each
// Player is an independent AI instance with its own memory and behavior.
//
// A zero-value Player is ready to use.
type Player struct {
	mu                sync.RWMutex
	interactionCond   *sync.Cond
	interactionActive bool
	role              string
	roleContext       map[string]any
	commands          map[string]commandInfo
	errorHandler      func(error)
	history           []Turn
	archivedHistory   string
	archiveInProgress bool
	archiveRetryAt    time.Time
}

// knowledgeBase returns the knowledge base used for AI interactions.
func (p *Player) knowledgeBase() map[string]any {
	return DefaultKnowledgeBase()
}

// transport returns the [Transport] instance used for AI communication.
func (p *Player) transport() Transport {
	return DefaultTransport()
}

// SetRole defines the character/persona that the AI should adopt during
// interactions. The optional context provides extra context about the role.
func (p *Player) SetRole__0(role string, context map[string]any) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.role = role
	p.roleContext = context
}

func (p *Player) SetRole__1(role string) {
	p.SetRole__0(role, nil)
}

// OnCmd registers a command that can be called by the AI during interaction.
// The command must be defined as a struct type T with exported fields as
// parameters. The handler is called when the AI decides to use this command.
func XGot_Player_XGox_OnCmd[T any](p *Player, handler func(cmd T) error) {
	var cmd T
	PlayerOnCmd_(p, cmd, handler)
}

// PlayerOnCmd_ is a helper func that is meant to be called by
// [XGot_Player_XGox_OnCmd] only.
func PlayerOnCmd_(p *Player, cmd any, handler any) {
	typ := reflect.TypeOf(cmd)
	if typ.Kind() != reflect.Struct {
		panic("AI command must be a struct type")
	}

	spec, err := extractCommandSpec(typ)
	if err != nil {
		panic(err)
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	if _, ok := p.commands[spec.Name]; !ok && len(p.commands) >= maxCommandCount {
		panic(fmt.Errorf("cannot register more than %d AI commands", maxCommandCount))
	}

	if p.commands == nil {
		p.commands = make(map[string]commandInfo)
	}
	p.commands[spec.Name] = commandInfo{
		typ:     typ,
		handler: handler,
		spec:    spec,
	}
}

// Think sends a message to the AI and processes its response. The optional
// context provides extra context for this specific interaction.
//
// Think implements an iterative loop, continuing interaction with the AI based
// on command execution results until the AI signals completion (no command) or
// a [Break] is encountered, or a critical error occurs.
func (p *Player) Think__0(msg string, context map[string]any) {
	spx.ExecuteNative(func(ctx stdContext.Context, owner any) {
		p.think(ctx, owner, msg, context)
	})
}

func (p *Player) Think__1(msg string) {
	p.Think__0(msg, nil)
}

func (p *Player) think(ctx stdContext.Context, owner any, msg string, context map[string]any) {
	const (
		transportTimeout     = 45 * time.Second       // Timeout for each transport call.
		maxTransportAttempts = 3                      // Maximum number of transport attempts per call.
		maxTurns             = 20                     // Maximum number of turns in a single call to prevent infinite loops.
		backoffBase          = 100 * time.Millisecond // Base time for exponential backoff calculation.
		backoffCap           = 2 * time.Second        // Maximum backoff time cap.
		maxContentLength     = 280                    // Maximum number of characters in the initial user input.
	)

	if msg == "" {
		p.handleError(owner, errors.New("missing content"))
		return
	}
	if utf8.RuneCountInString(msg) > maxContentLength {
		p.handleError(owner, fmt.Errorf("content length exceeds %d characters", maxContentLength))
		return
	}
	p.mu.RLock()
	hasCommands := len(p.commands) > 0
	p.mu.RUnlock()
	if !hasCommands {
		p.handleError(owner, errors.New("no available commands"))
		return
	}

	p.beginInteraction()
	defer func() {
		p.endInteraction()
		if ctx.Err() != nil {
			return
		}
		p.scheduleHistoryManagement(owner)
	}()

	currentMsg := msg
	currentContext := context
	for i := range maxTurns {
		// Prepare request.
		p.mu.RLock()
		currentRole := p.role
		currentRoleContext := p.roleContext
		currentKnowledgeBase := p.knowledgeBase()
		currentCommandSpecs := make([]CommandSpec, 0, len(p.commands))
		for _, info := range p.commands {
			currentCommandSpecs = append(currentCommandSpecs, info.spec)
		}
		slices.SortFunc(currentCommandSpecs, func(a, b CommandSpec) int {
			return cmp.Compare(a.Name, b.Name)
		})
		currentHistory := slices.Clone(p.history)
		currentArchivedHistory := p.archivedHistory
		currentTransport := p.transport()
		p.mu.RUnlock()

		request := Request{
			Content:          currentMsg,
			Context:          currentContext,
			Role:             currentRole,
			RoleContext:      currentRoleContext,
			KnowledgeBase:    currentKnowledgeBase,
			CommandSpecs:     currentCommandSpecs,
			History:          currentHistory,
			ArchivedHistory:  currentArchivedHistory,
			ContinuationTurn: i,
		}

		// Call AI transport with retries.
		resp, lastErr := retryTransportCall(
			ctx,
			maxTransportAttempts,
			backoffBase,
			backoffCap,
			transportTimeout,
			func(ctx stdContext.Context) (Response, error) {
				return currentTransport.Interact(ctx, request)
			},
		)
		if err := ctx.Err(); err != nil {
			p.handleError(owner, fmt.Errorf("ai interaction canceled: %w", err))
			return
		}
		if lastErr != nil {
			if !isRetryableTransportError(lastErr) {
				p.handleError(owner, fmt.Errorf("ai interaction failed: %w", lastErr))
				return
			}
			p.handleError(owner, fmt.Errorf("ai interaction failed after %d transport attempts: %w", maxTransportAttempts, lastErr))
			return
		}

		// Process AI response.
		if resp.CommandName == "" {
			if i == 0 {
				p.handleError(owner, errors.New("ai did not provide a command for the initial turn"))
			}
			return
		}

		var executedResult *CommandResult
		p.mu.RLock()
		cmdInfo, ok := p.commands[resp.CommandName]
		p.mu.RUnlock()
		if ok {
			var err error
			executedResult, err = callCommandHandler(owner, cmdInfo, resp.CommandArgs)
			if err != nil {
				p.handleError(owner, fmt.Errorf("failed to execute command %s: %w", resp.CommandName, err))
				return
			}
		} else {
			// AI requested a command that is not registered by the game. This is an error
			// from AI's behavior/request, report back via executedResult.
			executedResult = &CommandResult{
				ErrorMessage: fmt.Sprintf("ai requested unknown command: %s", resp.CommandName),
			}
		}

		// Update history and player's state.
		p.appendHistory(Turn{
			RequestContent:        request.Content,
			RequestContext:        request.Context,
			ResponseCommandName:   resp.CommandName,
			ResponseCommandArgs:   resp.CommandArgs,
			ExecutedCommandResult: executedResult,
			IsInitial:             i == 0,
		})

		// Check for [Break].
		if executedResult.IsBreak {
			return
		}

		// Prepare for the next iteration of the loop. The AI will decide the next step
		// based on the outcomes of commands executed within this loop.
		currentMsg = ""
		currentContext = nil
	}

	p.handleError(owner, fmt.Errorf("ai interaction did not complete within %d turns", maxTurns))
}

// beginInteraction acquires exclusive access for the upcoming interaction sequence.
func (p *Player) beginInteraction() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.interactionCond == nil {
		p.interactionCond = sync.NewCond(&p.mu)
	}
	for p.interactionActive {
		p.interactionCond.Wait()
	}
	p.interactionActive = true
}

// endInteraction releases exclusive access and wakes up any waiting sequence.
func (p *Player) endInteraction() {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.interactionActive = false
	p.interactionCond.Signal()
}

// OnErr registers a handler that is called when an AI interaction fails. If no
// handler is registered, a default one is used.
func (p *Player) OnErr__0(handler func(err error)) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.errorHandler = handler
}

func (p *Player) OnErr__1(handler func()) {
	p.OnErr__0(func(err error) {
		handler()
	})
}

// handleError processes errors that occur during AI interactions. It uses the
// registered error handler if available, otherwise falls back to a default one.
func (p *Player) handleError(owner any, err error) {
	p.mu.RLock()
	handler := p.errorHandler
	p.mu.RUnlock()

	if handler != nil {
		spx.Execute(owner, func(ctx stdContext.Context, owner any) {
			handler(err)
		})
		return
	}

	// Default error handling if no handler is set.
	log.Printf("ai error: %v", err)
}

// appendHistory appends a new turn to the interaction history.
func (p *Player) appendHistory(turn Turn) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.history = append(p.history, turn)
}

// scheduleHistoryManagement starts history management in an owner-scoped
// coroutine so it can outlive the caller without outliving its owner. The
// blocking archive work runs natively to avoid blocking the game engine.
func (p *Player) scheduleHistoryManagement(owner any) {
	spx.Go(owner, func(ctx stdContext.Context, _ any) {
		spx.ExecuteNative(func(_ stdContext.Context, _ any) {
			p.manageHistory(ctx)
		})
	})
}

// manageHistory checks if archiving is needed and performs it if necessary.
func (p *Player) manageHistory(ctx stdContext.Context) {
	const (
		archiveTimeout     = 120 * time.Second      // Timeout for archive operation.
		maxArchiveAttempts = 3                      // Maximum number of archive attempts.
		backoffBase        = 500 * time.Millisecond // Base time for exponential backoff.
		backoffCap         = 5 * time.Second        // Maximum backoff time cap.
	)

	// Prepare archive if needed.
	turnsToArchive, existingArchive := p.prepareArchive()
	if len(turnsToArchive) == 0 {
		return
	}

	// Perform archive with retries.
	transport := p.transport()
	archived, lastErr := retryTransportCall(
		ctx,
		maxArchiveAttempts,
		backoffBase,
		backoffCap,
		archiveTimeout,
		func(ctx stdContext.Context) (ArchivedHistory, error) {
			return transport.Archive(ctx, turnsToArchive, existingArchive)
		},
	)
	if err := ctx.Err(); err != nil {
		log.Printf("archive history canceled: %v", err)
		p.cancelArchive()
		return
	}
	if lastErr != nil {
		if !isRetryableTransportError(lastErr) {
			log.Printf("failed to archive history: %v", lastErr)
			p.deferArchiveRetry(lastErr)
			return
		}
		log.Printf("failed to archive history after %d attempts: %v", maxArchiveAttempts, lastErr)
		p.cancelArchive()
		return
	}

	// Apply the archive result.
	p.applyArchive(archived.Content, len(turnsToArchive))
}

// prepareArchive checks if archiving is needed and prepares the data for
// archiving. It returns nil if archiving is not needed or already in progress.
func (p *Player) prepareArchive() (turnsToArchive []Turn, existingArchive string) {
	const (
		threshold          = 30 // Trigger archive when history reaches this many turns.
		minRetained        = 15 // Keep at least this many most recent turns after archiving.
		maxTurnsPerArchive = 50 // Match the maximum archive request size accepted by the backend.
	)

	p.mu.Lock()
	defer p.mu.Unlock()

	if len(p.history) < threshold || p.archiveInProgress || time.Now().Before(p.archiveRetryAt) {
		return nil, ""
	}

	// Find the latest sequence boundary that preserves the retained history and
	// stays within the backend's archive request limit.
	maxArchivable := len(p.history) - minRetained
	searchStart := min(maxArchivable-1, maxTurnsPerArchive)
	boundary := 0

	// Start from the latest eligible position and go backwards.
	for i := searchStart; i >= 0; i-- {
		if p.history[i].IsInitial {
			// Found a sequence start, archive everything before this sequence.
			boundary = i
			break
		}
	}

	// If no IsInitial found in the archivable range, it likely means:
	//   - The current interaction sequence started before the archivable range
	//   - Or the history doesn't start with a sequence beginning (e.g., after restore)
	//
	// In this case, we choose not to archive to avoid splitting a sequence.
	if boundary == 0 {
		return nil, ""
	}

	// Mark as in progress and prepare data.
	p.archiveInProgress = true
	return slices.Clone(p.history[:boundary]), p.archivedHistory
}

// applyArchive updates the archived history and removes the archived turns.
func (p *Player) applyArchive(archived string, turnCount int) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.archivedHistory = archived
	p.history = p.history[turnCount:]
	p.archiveInProgress = false
	p.archiveRetryAt = time.Time{}
}

// deferArchiveRetry completes the current archive attempt and honors a future
// retry time from a client error.
func (p *Player) deferArchiveRetry(err error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.archiveInProgress = false
	p.archiveRetryAt = time.Time{}
	var clientErr *ClientError
	if errors.As(err, &clientErr) && clientErr.RetryAfter > 0 {
		p.archiveRetryAt = time.Now().Add(clientErr.RetryAfter)
	}
}

// cancelArchive resets the archive in progress flag.
func (p *Player) cancelArchive() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.archiveInProgress = false
	p.archiveRetryAt = time.Time{}
}
