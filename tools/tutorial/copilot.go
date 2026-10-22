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
//
// Generation can fail for reasons outside the author's control (the network,
// service quota), so it returns the error and lets the Course fall back
// instead of ending the learner's session.
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
//
// In Course code, XGo's error expressions keep the fallback on one line:
//
//	completeWith Copilot.generateText("give feedback on: " + code)?:"Well done!"
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
// A failed generation leaves result untouched, so values set beforehand
// survive as the fallback. That covers a response that does not decode into
// result as well: the generation failed just the same, and a half-filled
// struct would let the Course judge the learner on values nobody generated.
//
// result must be a non-nil pointer to a struct with at least one serializable
// exported field, and anything else fails the Course program rather than
// returning an error. That check is not pedantry: an XGo author very easily
// writes a field in lower case, which encoding/json can neither read nor
// fill, leaving the Course with an all-zero value and no hint as to why. A
// mistake in the Course code is for the author to fix while trying the
// Course, not for a fallback to hide.
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
	// Decoding into result directly could fail halfway and leave it partly
	// written, so first decode into a fresh value of the same type. Only when
	// that succeeds is result filled, with the usual encoding/json semantics
	// for fields the response leaves out. Both decodes go the same way because
	// deriveSchema admits no type with its own decoder, whose outcome could
	// depend on the value it decodes into.
	if err := json.Unmarshal(raw, reflect.New(reflect.TypeOf(result).Elem()).Interface()); err != nil {
		return fmt.Errorf("generateJSON: decode the generated value: %w", err)
	}
	if err := json.Unmarshal(raw, result); err != nil {
		return fmt.Errorf("generateJSON: decode the generated value: %w", err)
	}
	return nil
}
