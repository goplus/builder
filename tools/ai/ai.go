// Package ai provides a simple API for AI interactions in XBuilder games.
//
// This package is designed for children around 10 years old who are learning
// programming. It provides a minimalist API to integrate AI capabilities into
// games without requiring understanding of complex networking, error handling,
// or AI model details.
package ai

import (
	stdContext "context"
	"errors"
	"fmt"
	"log"
	"reflect"
	"slices"
	"sync"
	"time"

	"github.com/goplus/spx/v2/pkg/spx"
)

// GopPackage indicates that this package is a XGo package.
const GopPackage = true

// Break is a special error that signals the AI interaction should be terminated.
var Break = errors.New("break interaction")

// Player represents an AI agent capable of interacting with the game. Each
// Player is an independent AI instance with its own memory and behavior.
//
// A zero-value Player is ready to use.
type Player struct {
	mu                    sync.RWMutex
	role                  string
	roleContext           map[string]any
	commands              sync.Map // map[string]commandInfo
	errorHandler          func(error)
	history               []Turn
	archivedHistory       string
	previousCommandResult *CommandResult
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
func Gopt_Player_Gopx_OnCmd[T any](p *Player, handler func(cmd T) error) {
	var cmd T
	PlayerOnCmd_(p, cmd, handler)
}

// PlayerOnCmd_ is a helper func that is meant to be called by
// [Gopt_Player_Gopx_OnCmd] only.
func PlayerOnCmd_(p *Player, cmd any, handler any) {
	cmdType := reflect.TypeOf(cmd)
	if cmdType.Kind() != reflect.Struct {
		panic("AI command must be a struct type")
	}
	cmdTypeName := cmdType.Name()
	if cmdTypeName == "" {
		panic("AI command struct must have a name")
	}
	cmdID := cmdTypeName

	spec := extractCommandSpec(cmdType)
	p.commands.Store(cmdID, commandInfo{
		typ:     cmdType,
		handler: handler,
		spec:    spec,
	})
}

// Think sends a message to the AI and processes its response. The optional
// context provides extra context for this specific interaction.
//
// Think implements an iterative loop, continuing interaction with the AI based
// on command execution results until the AI signals completion (no command) or
// an [Break] is encountered, or a critical error occurs.
func (p *Player) Think__0(msg string, context map[string]any) {
	spx.ExecuteNative(func(owner any) {
		p.think(owner, msg, context)
	})
}
func (p *Player) Think__1(msg string) {
	p.Think__0(msg, nil)
}
func (p *Player) think(owner any, msg string, context map[string]any) {
	const (
		transportTimeout    = 45 * time.Second       // Timeout for each transport call.
		maxTransportRetries = 3                      // Maximum number of retries for each AI transport call.
		maxTurns            = 20                     // Maximum number of turns in a single call to prevent infinite loops.
		backoffBase         = 100 * time.Millisecond // Base time for exponential backoff calculation.
		backoffCap          = 2 * time.Second        // Maximum backoff time cap.
	)

	var (
		currentMsg     = msg
		currentContext = context

		hasExecutedAtLeastOneCommandInThisCall bool
	)
	for i := range maxTurns {
		// Prepare request.
		p.mu.RLock()
		currentRole := p.role
		currentRoleContext := p.roleContext
		currentHistory := slices.Clone(p.history)
		currentArchivedHistory := p.archivedHistory
		var currentCommandSpecs []CommandSpec
		p.commands.Range(func(k, v any) bool {
			if info, ok := v.(commandInfo); ok {
				currentCommandSpecs = append(currentCommandSpecs, info.spec)
			}
			return true
		})
		currentKnowledgeBase := p.knowledgeBase()
		currentPrevCmdResult := p.previousCommandResult
		p.mu.RUnlock()

		request := Request{
			Content:               currentMsg,
			Context:               currentContext,
			Role:                  currentRole,
			RoleContext:           currentRoleContext,
			History:               currentHistory,
			ArchivedHistory:       currentArchivedHistory,
			CommandSpecs:          currentCommandSpecs,
			KnowledgeBase:         currentKnowledgeBase,
			PreviousCommandResult: currentPrevCmdResult,
			ContinuationTurn:      i,
		}

		// Call AI transport with retries.
		transport := p.transport()
		var (
			resp    Response
			lastErr error
		)
	TransportRetryLoop:
		for attempt := range maxTransportRetries {
			ctx, cancel := stdContext.WithTimeout(stdContext.Background(), transportTimeout)

			if attempt > 0 {
				select {
				case <-time.After(backoffSleep(backoffBase, backoffCap, attempt)):
				case <-ctx.Done():
					lastErr = ctx.Err()
					cancel()
					break TransportRetryLoop
				}
			}

			resp, lastErr = transport.Interact(ctx, request)
			cancel()
			if lastErr == nil {
				break TransportRetryLoop
			}
		}
		if lastErr != nil {
			p.handleError(owner, fmt.Errorf("ai interaction failed after %d transport retries: %w", maxTransportRetries, lastErr))
			return
		}

		// Process AI response.
		if resp.CommandName == "" {
			// AI returned no command. This signifies the end of the current interaction
			// sequence from AI's perspective. Record this "no command" turn.
			noCmdTurn := Turn{
				RequestContent: request.Content,
				RequestContext: request.Context,
				ResponseText:   resp.Text,
			}
			p.mu.Lock()
			p.history = append(p.history, noCmdTurn)
			p.mu.Unlock()

			if !hasExecutedAtLeastOneCommandInThisCall {
				p.handleError(owner, errors.New("ai did not provide an initial command or any command during the interaction"))
			}
			return
		}
		hasExecutedAtLeastOneCommandInThisCall = true

		var executedResult *CommandResult
		if cmdInfoIface, ok := p.commands.Load(resp.CommandName); ok {
			cmdInfo, ok := cmdInfoIface.(commandInfo)
			if !ok {
				p.handleError(owner, fmt.Errorf("invalid type found in command map for %s", resp.CommandName))
				return
			}

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
				Success:      false,
				ErrorMessage: fmt.Sprintf("ai requested unknown command: %s", resp.CommandName),
				IsBreak:      false,
			}
		}

		// Update history and player's state.
		currentTurn := Turn{
			RequestContent:        request.Content,
			RequestContext:        request.Context,
			ResponseText:          resp.Text,
			ResponseCommandName:   resp.CommandName,
			ResponseCommandArgs:   resp.CommandArgs,
			ExecutedCommandResult: executedResult,
		}
		p.mu.Lock()
		p.history = append(p.history, currentTurn)

		// Handle archived history if present in response.
		if resp.ArchivedHistory != nil {
			p.archivedHistory = resp.ArchivedHistory.Content

			// Remove the archived turns from the beginning of history.
			if resp.ArchivedHistory.TurnCount > 0 && len(p.history) >= resp.ArchivedHistory.TurnCount {
				p.history = p.history[resp.ArchivedHistory.TurnCount:]
			}
		}

		p.previousCommandResult = executedResult
		p.mu.Unlock()

		// Check for [Break].
		if executedResult.IsBreak {
			return
		}

		// Prepare for the next iteration of the loop. The AI will decide the next step
		// based on the p.previousCommandResult.
		currentMsg = ""
		currentContext = nil
	}
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
		spx.Execute(owner, func(owner any) {
			handler(err)
		})
		return
	}

	// Default error handling if no handler is set.
	log.Printf("AI error: %v", err)
}
