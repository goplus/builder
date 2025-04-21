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
	CommandSpecs          []CommandSpec
	PreviousCommandResult *CommandResult
}

// renderSystemPrompt renders the system prompt template with the given request data.
func renderSystemPrompt(request *Request) (string, error) {
	data := promptTemplateData{
		Role:                  request.Role,
		CommandSpecs:          request.CommandSpecs,
		PreviousCommandResult: request.PreviousCommandResult,
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

	var sb strings.Builder
	if err := systemPromptTmpl.Execute(&sb, data); err != nil {
		return "", fmt.Errorf("failed to render system prompt template: %w", err)
	}
	return sb.String(), nil
}
