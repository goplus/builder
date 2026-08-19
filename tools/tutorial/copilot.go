package tutorial

// Copilot generates text and structured values for the Course. These requests
// never appear in the learner's conversation with Copilot.
type Copilot struct{}

// CopilotRound is one finished exchange between the learner and Copilot.
type CopilotRound struct {
	UserMessage    string   `json:"userMessage"`
	ResultMessages []string `json:"resultMessages"`
}

// OnRoundFinish registers a callback that runs when the learner finishes a
// Copilot round.
func (p *Copilot) OnRoundFinish(handler func(round CopilotRound)) {
	setHandler(func(h *handlers) { h.copilotRound = handler })
}

// GenerateText asks Copilot for one plain-text response. It is useful where a
// deterministic check cannot judge the goal, such as feedback on the learner's
// own solution.
func (p *Copilot) GenerateText(message string) string {
	var text string
	mustCallCapability("copilot_generateText", contentRequest{Content: message}, &text)
	return text
}

// GenerateJSON asks Copilot for a value shaped like result, which must be a
// non-nil pointer to a struct with at least one exported field. The framework
// derives result's JSON Schema, sends it along with the message and decodes
// the response back into result.
func (p *Copilot) GenerateJSON(message string, result any) {
	schema, err := deriveSchema(result)
	if err != nil {
		panic(err)
	}
	mustCallCapability("copilot_generateJSON", struct {
		Content string         `json:"content"`
		Schema  map[string]any `json:"schema"`
	}{Content: message, Schema: schema}, result)
}
