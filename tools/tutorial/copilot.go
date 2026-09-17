package tutorial

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
// Copilot. The json tags map directly onto the copilot.roundFinish payload in
// the contract, and the decoded value is handed to the Course as is.
type CopilotRound struct {
	UserMessage    string   `json:"userMessage"`
	ResultMessages []string `json:"resultMessages"`
}

// OnRoundFinish__0 registers a callback for the learner finishing a round of
// conversation with Copilot; several may be registered. It lets the Course
// notice what the learner asked for help with, for example to offer an extra
// hint after too many questions. See Runtime in editor.go for what the three
// overloads mean.
func (p *Copilot) OnRoundFinish__0(handler func(round CopilotRound)) {
	p.onRoundFinish(nil, handler)
}

// OnRoundFinish__1 is OnRoundFinish with a run policy.
func (p *Copilot) OnRoundFinish__1(policy RunPolicy, handler func(round CopilotRound)) {
	p.onRoundFinish(&runGroup{p: p.courseProgram, policy: policy}, handler)
}

// OnRoundFinish__2 is OnRoundFinish joining a run group.
func (p *Copilot) OnRoundFinish__2(group RunGroup, handler func(round CopilotRound)) {
	p.onRoundFinish(groupOf(group), handler)
}

func (p *Copilot) onRoundFinish(group *runGroup, handler func(round CopilotRound)) {
	register(p.courseProgram, group, handler,
		func(h *handlers, r *registration[CopilotRound]) { h.copilotRound = append(h.copilotRound, r) })
}

// GenerateText has Copilot generate a piece of plain text and returns it.
//
// It covers what deterministic checks cannot: judging expressive goals (have
// the sprite say hello, where anything sensible counts) or generating
// personalized feedback from the learner's actual code. The calling run is
// suspended for the duration, possibly for seconds, which is why the dispatch
// queue is generously sized (see pendingEventLimit in events.go).
func (p *Copilot) GenerateText(message string) string {
	var text string
	p.courseProgram.mustCallCapability("copilot_generateText", contentRequest{Content: message}, &text)
	return text
}

// GenerateJSON has Copilot generate a structured result, filled straight into
// the struct result points at.
//
// In Course code:
//
//	feedback := &Feedback{}
//	Copilot.generateJSON "review this code", feedback
//	if feedback.Score > 3 { ... }
//
// The framework derives a JSON Schema from result's struct type by reflection
// and sends it along with message; the frontend constrains the LLM's output
// with that schema, and xgoexec's bridge decodes the returned JSON into
// result. See deriveSchema for why reflection works on Course types.
//
// result must be a non-nil pointer to a struct with at least one serializable
// exported field, and anything else is an error and therefore a panic. That
// check is not pedantry: an XGo author very easily writes a field in lower
// case, which encoding/json can neither read nor fill, leaving the Course with
// an all-zero value and no hint as to why.
func (p *Copilot) GenerateJSON(message string, result any) {
	schema, err := deriveSchema(result)
	if err != nil {
		panic(err)
	}
	p.courseProgram.mustCallCapability("copilot_generateJSON", struct {
		Content string         `json:"content"`
		Schema  map[string]any `json:"schema"`
	}{Content: message, Schema: schema}, result)
}
