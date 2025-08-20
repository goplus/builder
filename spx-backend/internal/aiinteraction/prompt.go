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

	// archiveSystemPromptTemplate is the embedded archive system prompt template.
	//
	//go:embed archive_system_prompt.md
	archiveSystemPromptTemplate string

	// archiveSystemPromptTmpl is the parsed template for the archive system prompt.
	archiveSystemPromptTmpl = template.Must(template.New("archive_system_prompt").Parse(archiveSystemPromptTemplate))
)

// promptTemplateData contains the data for rendering the system prompt template.
type promptTemplateData struct {
	Role                  string
	RoleContext           string
	KnowledgeBase         string
	CommandSpecs          string
	PreviousCommandResult *CommandResult
	History               string
	ArchivedHistory       string
	ContinuationTurn      int
}

// renderSystemPrompt renders the system prompt template with the given request data.
func renderSystemPrompt(request *Request) (string, error) {
	data := promptTemplateData{
		Role:                  request.Role,
		PreviousCommandResult: request.PreviousCommandResult,
		ArchivedHistory:       request.ArchivedHistory,
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
	if len(request.History) > 0 {
		historyJSON, err := json.Marshal(request.History)
		if err != nil {
			return "", fmt.Errorf("failed to marshal history: %w", err)
		}
		data.History = string(historyJSON)
	}

	var sb strings.Builder
	if err := systemPromptTmpl.Execute(&sb, data); err != nil {
		return "", fmt.Errorf("failed to render system prompt template: %w", err)
	}
	return sb.String(), nil
}

// archiveSystemPromptData contains the data for rendering the archive system prompt template.
type archiveSystemPromptData struct {
	ExistingArchive string
	TurnsToArchive  string
}

// renderArchiveSystemPrompt renders the archive system prompt template with the given data.
func renderArchiveSystemPrompt(existingArchive string, turnsToArchive []Turn) (string, error) {
	data := archiveSystemPromptData{
		ExistingArchive: existingArchive,
	}

	turnsToArchiveJSON, err := json.Marshal(turnsToArchive)
	if err != nil {
		return "", fmt.Errorf("failed to marshal turns to archive: %w", err)
	}
	data.TurnsToArchive = string(turnsToArchiveJSON)

	var sb strings.Builder
	if err := archiveSystemPromptTmpl.Execute(&sb, data); err != nil {
		return "", fmt.Errorf("failed to render archive system prompt template: %w", err)
	}
	return sb.String(), nil
}
