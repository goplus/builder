package tutorial

import (
	"encoding/json"
	"fmt"
	"reflect"
)

// Copilot gives the Course its LLM capabilities.
//
// This is a separate thing from the learner asking Copilot for help: requests
// made here never appear in the learner's conversation with Copilot, they are
// the Course code's own means of judging and generating. In product terms,
// Copilot in a Playground Course is an assistant standing by for the learner
// and a capability called on demand by the Course code.
type Copilot struct {
	courseProgram *courseProgram
}

// CopilotRound is one complete round of conversation between the learner and
// Copilot. The json tags map directly onto the copilot.roundComplete payload in
// the contract, and the decoded value is handed to the Course as is.
type CopilotRound struct {
	UserMessage    string   `json:"userMessage"`
	ResultMessages []string `json:"resultMessages"`
}

// OnRoundComplete registers a callback for the learner completing a round of
// conversation with Copilot; several may be registered. It lets the Course
// notice what the learner asked for help with, for example to offer an extra
// hint after too many questions.
func (p *Copilot) OnRoundComplete(handler func(round CopilotRound)) {
	register(p.courseProgram, handler,
		func(h *handlers, r *registration[CopilotRound]) { h.copilotRound = append(h.copilotRound, r) })
}

// GenerateText has Copilot generate a piece of plain text and returns it, or
// returns an error when the generation fails.
//
// It covers what deterministic checks cannot: judging expressive goals (have
// the sprite say hello, where anything sensible counts) or generating
// personalized feedback from the learner's actual code. The calling run is
// suspended for the duration, possibly for seconds, which is why the dispatch
// queue is generously sized (see pendingEventLimit in events.go).
func (p *Copilot) GenerateText(message string) (string, error) {
	var text string
	if err := p.courseProgram.tryCallCapability("copilot_generateText", contentRequest{Content: message}, &text); err != nil {
		return "", fmt.Errorf("generateText: %w", err)
	}
	return text, nil
}

// GenerateJSON has Copilot generate a structured result, filled straight into
// the struct result points at, or returns an error when the generation fails.
//
// In Course code:
//
//	feedback := &Feedback{}
//	err := Copilot.generateJSON("review this code", feedback)
//	if err == nil && feedback.Score > 3 { ... }
//
// The framework derives a JSON Schema from result's struct type by reflection
// and sends it along with message; the frontend constrains the LLM's output
// with that schema, and the response is decoded into result. See deriveSchema
// for why reflection works on Course types.
//
// A failed generation, including a response that does not decode into
// result, returns an error and leaves result untouched.
//
// result must be a non-nil pointer to a struct with at least one serializable
// exported field; anything else fails the Course program rather than
// returning an error.
func (p *Copilot) GenerateJSON(message string, result any) error {
	p.courseProgram.requireRun("calling generateJSON")
	schema, err := deriveSchema(result)
	if err != nil {
		panic(err)
	}
	var raw json.RawMessage
	err = p.courseProgram.tryCallCapability("copilot_generateJSON", struct {
		Content string         `json:"content"`
		Schema  map[string]any `json:"schema"`
	}{Content: message, Schema: schema}, &raw)
	if err != nil {
		return fmt.Errorf("generateJSON: %w", err)
	}
	// Decode into a fresh value first so that a failure leaves result untouched.
	if err := json.Unmarshal(raw, reflect.New(reflect.TypeOf(result).Elem()).Interface()); err != nil {
		return fmt.Errorf("generateJSON: decode the generated value: %w", err)
	}
	if err := json.Unmarshal(raw, result); err != nil {
		return fmt.Errorf("generateJSON: decode the generated value: %w", err)
	}
	return nil
}
