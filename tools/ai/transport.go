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
	// greater than 0 indicate continuation turns and must equal the number
	// of completed turns in the current interaction sequence, up to 19. The
	// latest completed turn must not contain a BREAK signal.
	ContinuationTurn int `json:"continuationTurn,omitempty"`
}

// Response encapsulates the response received from the AI via the [Transport].
type Response struct {
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

	// ResponseCommandName is the command requested by the AI in this turn's response.
	ResponseCommandName string `json:"responseCommandName,omitempty"`

	// ResponseCommandArgs are the arguments for the command requested by the AI.
	ResponseCommandArgs map[string]any `json:"responseCommandArgs,omitempty"`

	// ExecutedCommandResult holds the result of executing the command requested in
	// this turn's response. Every recorded turn contains a result.
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

// ErrTransportNotSet indicates that the AI transport has not been configured via [SetDefaultTransport].
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

// TooManyRequestsError represents a transport-level HTTP 429 error.
type TooManyRequestsError struct {
	RetryAfter time.Duration
	Err        error
}

// Error implements [error].
func (tmr *TooManyRequestsError) Error() string {
	if tmr.RetryAfter > 0 {
		if tmr.Err != nil {
			return fmt.Sprintf("too many requests (retry after %s): %v", tmr.RetryAfter, tmr.Err)
		}
		return fmt.Sprintf("too many requests (retry after %s)", tmr.RetryAfter)
	}
	if tmr.Err != nil {
		return fmt.Sprintf("too many requests: %v", tmr.Err)
	}
	return "too many requests"
}

// Unwrap returns the underlying error.
func (tmr *TooManyRequestsError) Unwrap() error {
	return tmr.Err
}

// RetryableError marks a transport failure that is safe to attempt again.
type RetryableError struct {
	Err error
}

// Error implements [error].
func (re *RetryableError) Error() string {
	if re.Err == nil {
		return "retryable transport error"
	}
	return re.Err.Error()
}

// Unwrap returns the underlying error.
func (re *RetryableError) Unwrap() error {
	return re.Err
}

// ClientError describes a non-retryable HTTP 4xx response other than 429.
type ClientError struct {
	StatusCode int
	RetryAfter time.Duration
	Err        error
}

// Error implements [error].
func (ce *ClientError) Error() string {
	if ce.Err == nil {
		return fmt.Sprintf("client request failed with status %d", ce.StatusCode)
	}
	return ce.Err.Error()
}

// Unwrap returns the underlying error.
func (ce *ClientError) Unwrap() error {
	return ce.Err
}

// isRetryableTransportError reports whether a failed transport call is
// explicitly safe to attempt again.
func isRetryableTransportError(err error) bool {
	var tooManyRequestsErr *TooManyRequestsError
	if errors.As(err, &tooManyRequestsErr) {
		return true
	}
	var retryableErr *RetryableError
	return errors.As(err, &retryableErr)
}

// retryTransportCall calls a transport operation with bounded timeouts,
// backoff, and rate-limit waits.
func retryTransportCall[T any](
	ctx context.Context,
	maxAttempts int,
	backoffBase time.Duration,
	backoffCap time.Duration,
	callTimeout time.Duration,
	call func(context.Context) (T, error),
) (result T, err error) {
	const rateLimitWaitTimeout = 2 * time.Minute

	var rateGate rateLimitGate
	for range backoffAttempts(ctx, maxAttempts, backoffBase, backoffCap) {
		waitCtx, waitCancel := context.WithTimeout(ctx, rateLimitWaitTimeout)
		waitErr := rateGate.Wait(waitCtx)
		waitCancel()
		if waitErr != nil {
			return result, fmt.Errorf("aborted due to excessive rate limit wait time (%s)", rateLimitWaitTimeout)
		}

		callCtx, callCancel := context.WithTimeout(ctx, callTimeout)
		result, err = call(callCtx)
		callCancel()
		if err == nil || !isRetryableTransportError(err) {
			return result, err
		}

		rateGate.Observe(err)
	}
	return result, err
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
	if retryAt, err := parseHTTPTime(value); err == nil {
		wait := time.Until(retryAt)
		if wait <= 0 {
			return 0
		}
		return wait
	}
	return 0
}

const httpTimeFormat = "Mon, 02 Jan 2006 15:04:05 GMT"

var httpTimeFormats = []string{
	httpTimeFormat,
	time.RFC850,
	time.ANSIC,
}

// parseHTTPTime parses a time header (such as the Date: header), trying each of
// the three formats allowed by HTTP/1.1: [TimeFormat], [time.RFC850], and
// [time.ANSIC].
//
// NOTE: This is a copy of [net/http.ParseTime], so we don't need to import
// net/http since this package is mainly used in WebAssembly environments.
func parseHTTPTime(text string) (t time.Time, err error) {
	for _, layout := range httpTimeFormats {
		t, err = time.Parse(layout, text)
		if err == nil {
			return
		}
	}
	return
}

// rateLimitGate coordinates Retry-After windows so callers wait until the
// backend allows another attempt.
type rateLimitGate struct {
	nextAllowed time.Time
}

// Wait blocks until the gate opens or the provided context finishes. It returns
// nil when waiting is not required or the wait completes. Otherwise it returns
// ctx.Err().
func (rlg *rateLimitGate) Wait(ctx context.Context) error {
	wait := time.Until(rlg.nextAllowed)
	if wait <= 0 {
		return nil
	}

	timer := time.NewTimer(wait)
	defer timer.Stop()

	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Observe records rate limiting hints from errors returned by the [Transport].
func (rlg *rateLimitGate) Observe(err error) {
	var tmrErr *TooManyRequestsError
	if !errors.As(err, &tmrErr) {
		return
	}

	delay := tmrErr.RetryAfter
	if delay <= 0 {
		delay = time.Second
	}

	retryAt := time.Now().Add(delay)
	if retryAt.After(rlg.nextAllowed) {
		rlg.nextAllowed = retryAt
	}
}
