package ai

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Transport defines the interface for communicating with the AI backend.
type Transport interface {
	// Interact sends a request to the AI and returns its response.
	Interact(ctx context.Context, req Request) (Response, error)

	// Archive sends interaction turns to be archived and returns the
	// condensed summary.
	Archive(ctx context.Context, turns []Turn, existingArchive string) (ArchivedHistory, error)
}

// Request encapsulates all information sent to the AI via the [Transport].
type Request struct {
	// Content is the core user input.
	Content string `json:"content,omitempty"`

	// Context is the specific context for the current user input.
	Context map[string]any `json:"context,omitempty"`

	// Role defines the persona the AI should adopt.
	Role string `json:"role,omitempty"`

	// RoleContext provides additional context specific to the role.
	RoleContext map[string]any `json:"roleContext,omitempty"`

	// KnowledgeBase contains background knowledge.
	KnowledgeBase map[string]any `json:"knowledgeBase,omitempty"`

	// CommandSpecs lists the commands the AI is allowed to call.
	CommandSpecs []CommandSpec `json:"commandSpecs,omitempty"`

	// History contains the record of previous interactions in this session.
	History []Turn `json:"history,omitempty"`

	// ArchivedHistory contains the content of archived historical interactions.
	ArchivedHistory string `json:"archivedHistory,omitempty"`

	// ContinuationTurn indicates the current turn number in a multi-turn
	// interaction sequence.
	//
	// A value of 0 means this is the initial turn from user input. Values
	// > 0 indicate continuation turns where the AI continues the current
	// interaction sequence based on the outcomes of commands executed
	// within this sequence.
	ContinuationTurn int `json:"continuationTurn,omitempty"`
}

// Response encapsulates the response received from the AI via the [Transport].
type Response struct {
	// Text is the textual part of the AI's response.
	Text string `json:"text"`

	// CommandName is the name of the command the AI wants to execute.
	CommandName string `json:"commandName,omitempty"`

	// CommandArgs holds the arguments for the command to be executed.
	CommandArgs map[string]any `json:"commandArgs,omitempty"`
}

// Turn represents a single turn in the conversation history.
type Turn struct {
	// RequestContent is the user's input text for that turn.
	RequestContent string `json:"requestContent,omitempty"`

	// RequestContext is the context for the user's input text for the turn.
	RequestContext map[string]any `json:"context,omitempty"`

	// ResponseText is the AI's text output for that turn.
	ResponseText string `json:"responseText"`

	// ResponseCommandName is the command requested by the AI in this turn's response.
	ResponseCommandName string `json:"responseCommandName,omitempty"`

	// ResponseCommandArgs are the arguments for the command requested by the AI.
	ResponseCommandArgs map[string]any `json:"responseCommandArgs,omitempty"`

	// ExecutedCommandResult holds the result of executing the command requested in
	// this turn's response. Nil if execution hasn't happened/failed before result
	// recording.
	ExecutedCommandResult *CommandResult `json:"executedCommandResult,omitempty"`

	// IsInitial indicates whether this turn is the initial turn of an
	// interaction sequence (i.e., ContinuationTurn == 0).
	IsInitial bool `json:"isInitial,omitempty"`
}

// ArchivedHistory contains information about archived historical interactions.
type ArchivedHistory struct {
	// Content is the archived content of historical interactions.
	Content string `json:"content"`
}

// ErrTransportNotSet indicates that the AI transport has not been configured via [SetGlobalTransport].
var ErrTransportNotSet = errors.New("transport not set")

// notSetTransport is the [Transport] implementation that always returns [ErrTransportNotSet].
type notSetTransport struct{}

// Interact implements [Transport].
func (t *notSetTransport) Interact(_ context.Context, _ Request) (Response, error) {
	return Response{}, ErrTransportNotSet
}

// Archive implements [Transport].
func (t *notSetTransport) Archive(_ context.Context, _ []Turn, _ string) (ArchivedHistory, error) {
	return ArchivedHistory{}, ErrTransportNotSet
}

var (
	// defaultTransport holds the default instance of [Transport].
	defaultTransport   Transport = &notSetTransport{}
	defaultTransportMu sync.RWMutex
)

// DefaultTransport returns the default [Transport] instance.
func DefaultTransport() Transport {
	defaultTransportMu.RLock()
	defer defaultTransportMu.RUnlock()
	return defaultTransport
}

// SetDefaultTransport sets the default instance of [Transport] used for AI
// communication. It resets to the [notSetTransport] if nil is provided.
func SetDefaultTransport(t Transport) {
	defaultTransportMu.Lock()
	defer defaultTransportMu.Unlock()
	if t == nil {
		t = &notSetTransport{}
	}
	defaultTransport = t
}

// RateLimitError represents a transport-level rate limiting error.
type RateLimitError struct {
	RetryAfter time.Duration
	Err        error
}

// Error implements [error].
func (rle *RateLimitError) Error() string {
	if rle.RetryAfter > 0 {
		if rle.Err != nil {
			return fmt.Sprintf("rate limited (retry after %s): %v", rle.RetryAfter, rle.Err)
		}
		return fmt.Sprintf("rate limited (retry after %s)", rle.RetryAfter)
	}
	if rle.Err != nil {
		return fmt.Sprintf("rate limited: %v", rle.Err)
	}
	return "rate limited"
}

// Unwrap returns the underlying error.
func (rle *RateLimitError) Unwrap() error {
	return rle.Err
}

// RetryAfterFromHeader converts a Retry-After header value to [time.Duration].
func RetryAfterFromHeader(value string) time.Duration {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	if secs, err := strconv.Atoi(value); err == nil {
		if secs <= 0 {
			return 0
		}
		return time.Duration(secs) * time.Second
	}
	if d, err := time.ParseDuration(value); err == nil {
		if d <= 0 {
			return 0
		}
		return d
	}
	return 0
}

// rateLimitGate coordinates Retry-After windows so callers wait until the
// backend allows another attempt.
type rateLimitGate struct {
	nextAllowed time.Time
}

// Wait blocks until the next allowed time if the backend asked us to delay.
func (rlg *rateLimitGate) Wait() {
	wait := time.Until(rlg.nextAllowed)
	if wait > 0 {
		time.Sleep(wait)
	}
}

// Observe records rate limiting hints from errors returned by the [Transport].
func (rlg *rateLimitGate) Observe(err error) {
	var rateErr *RateLimitError
	if !errors.As(err, &rateErr) {
		return
	}

	retryAt := time.Now().Add(rateErr.RetryAfter)
	if retryAt.After(rlg.nextAllowed) {
		rlg.nextAllowed = retryAt
	}
}
