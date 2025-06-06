package aiinteraction

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"
)

var (
	// systemPromptTemplate is the embedded system prompt template.
	//
	//go:embed system_prompt.md
	systemPromptTemplate string

	// systemPromptTmpl is the parsed template for the system prompt.
	systemPromptTmpl = template.Must(template.New("system_prompt").Parse(systemPromptTemplate))
)

// promptTemplateData contains the data for rendering the system prompt template.
type promptTemplateData struct {
	Role                  string
	RoleContext           string
	KnowledgeBase         string
	CommandSpecs          string
	PreviousCommandResult *CommandResult
	ContinuationTurn      int
}

// renderSystemPrompt renders the system prompt template with the given request data.
func renderSystemPrompt(request *Request) (string, error) {
	data := promptTemplateData{
		Role:                  request.Role,
		PreviousCommandResult: request.PreviousCommandResult,
		ContinuationTurn:      request.ContinuationTurn,
	}
	if len(request.RoleContext) > 0 {
		roleContextJSON, err := json.Marshal(request.RoleContext)
		if err != nil {
			return "", fmt.Errorf("failed to marshal role context: %w", err)
		}
		data.RoleContext = string(roleContextJSON)
	}
	if len(request.KnowledgeBase) > 0 {
		knowledgeBaseJSON, err := json.Marshal(request.KnowledgeBase)
		if err != nil {
			return "", fmt.Errorf("failed to marshal knowledge base: %w", err)
		}
		data.KnowledgeBase = string(knowledgeBaseJSON)
	}
	if len(request.CommandSpecs) > 0 {
		commandSpecsJSON, err := json.Marshal(request.CommandSpecs)
		if err != nil {
			return "", fmt.Errorf("failed to marshal command specs: %w", err)
		}
		data.CommandSpecs = string(commandSpecsJSON)
	}

	var sb strings.Builder
	if err := systemPromptTmpl.Execute(&sb, data); err != nil {
		return "", fmt.Errorf("failed to render system prompt template: %w", err)
	}
	return sb.String(), nil
}
