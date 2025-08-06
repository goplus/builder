package ai

import (
	"context"
	"errors"
	"sync"
)

// Transport defines the interface for communicating with the AI backend.
type Transport interface {
	// Interact sends a request to the AI and returns its response.
	Interact(ctx context.Context, req Request) (Response, error)
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

	// PreviousCommandResult holds the outcome of the command executed in
	// the previous turn, if any. A nil value indicates no command was
	// executed previously or the previous turn didn't involve a command.
	PreviousCommandResult *CommandResult `json:"previousCommandResult,omitempty"`

	// History contains the record of previous interactions in this session.
	History []Turn `json:"history,omitempty"`

	// ArchivedHistory contains the content of archived historical interactions.
	ArchivedHistory string `json:"archivedHistory,omitempty"`

	// ContinuationTurn indicates the current turn number in a multi-turn
	// interaction.
	//
	// A value of 0 means this is the initial turn from user input. Values
	// > 0 indicate continuation turns where the AI should decide next
	// steps based on previous command results.
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

	// ArchivedHistory contains archived history information when history management occurs.
	ArchivedHistory *ArchivedHistory `json:"archivedHistory,omitempty"`
}

// ArchivedHistory contains information about archived historical interactions.
type ArchivedHistory struct {
	// Content is the archived content of historical interactions.
	Content string `json:"content"`

	// TurnCount indicates how many turns were archived.
	TurnCount int `json:"turnCount"`
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
}

// ErrTransportNotSet indicates that the AI transport has not been configured via [SetGlobalTransport].
var ErrTransportNotSet = errors.New("transport not set")

// notSetTransport is the [Transport] implementation that always returns [ErrTransportNotSet].
type notSetTransport struct{}

// Interact implements [Transport].
func (t *notSetTransport) Interact(_ context.Context, _ Request) (Response, error) {
	return Response{}, ErrTransportNotSet
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
