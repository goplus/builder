package aiinteraction

// Request represents a request for AI interaction.
type Request struct {
	// Content is the core user input message.
	Content string `json:"content,omitempty"`

	// Context provides specific context for the current user input.
	Context map[string]any `json:"context,omitempty"`

	// Role defines the persona the AI should adopt.
	Role string `json:"role,omitempty"`

	// RoleContext provides additional context specific to the role.
	RoleContext map[string]any `json:"roleContext,omitempty"`

	// KnowledgeBase provides background knowledge to the AI.
	KnowledgeBase map[string]any `json:"knowledgeBase,omitempty"`

	// CommandSpecs defines the commands the AI is allowed to call.
	CommandSpecs []CommandSpec `json:"commandSpecs,omitempty"`

	// PreviousCommandResult contains the outcome of the command executed in the previous turn.
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

// Response represents a response from the AI interaction.
type Response struct {
	// Text is the textual part of the AI's response.
	Text string `json:"text"`

	// CommandName is the name of the command the AI wants to execute.
	CommandName string `json:"commandName,omitempty"`

	// CommandArgs contains the arguments for the command to be executed.
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

// Turn represents a single turn in the AI interaction.
type Turn struct {
	// RequestContent is the user's input text for the turn.
	RequestContent string `json:"requestContent,omitempty"`

	// RequestContext is the context for the user's input text for the turn.
	RequestContext map[string]any `json:"context,omitempty"`

	// ResponseText is the AI's text output for the turn.
	ResponseText string `json:"responseText"`

	// ResponseCommandName is the command requested by the AI in the response.
	ResponseCommandName string `json:"responseCommandName,omitempty"`

	// ResponseCommandArgs contains the arguments for the command requested by the AI.
	ResponseCommandArgs map[string]any `json:"responseCommandArgs,omitempty"`

	// ExecutedCommandResult contains the result of executing the command requested in the response.
	ExecutedCommandResult *CommandResult `json:"executedCommandResult,omitempty"`

	// IsInitial indicates whether this turn is the initial turn of an
	// interaction sequence (i.e., ContinuationTurn == 0).
	IsInitial bool `json:"isInitial,omitempty"`
}

// CommandSpec defines a command that can be called by the AI.
type CommandSpec struct {
	// Name is the unique identifier for the command.
	Name string `json:"name"`

	// Description explains what the command does.
	Description string `json:"description,omitempty"`

	// Parameters defines the parameters the command accepts.
	Parameters []CommandParamSpec `json:"parameters,omitempty"`
}

// CommandParamSpec defines a parameter for a command.
type CommandParamSpec struct {
	// Name is the parameter name.
	Name string `json:"name"`

	// Type is the Go type name of the parameter.
	Type string `json:"type"`

	// Description explains the purpose of the parameter.
	Description string `json:"description,omitempty"`
}

// CommandResult contains the result of executing a command.
type CommandResult struct {
	// Success indicates if the command execution was successful.
	Success bool `json:"success"`

	// ErrorMessage provides error details if execution failed.
	ErrorMessage string `json:"errorMessage,omitempty"`

	// IsBreak indicates if the interaction should be terminated.
	IsBreak bool `json:"isBreak,omitempty"`
}
