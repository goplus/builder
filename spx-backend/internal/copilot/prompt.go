package copilot

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// For details about maintaining `*_defs.md` files, see:
// spx-gui/src/components/editor/code-editor/document-base/helpers.ts

//go:embed gop_defs.md
var GopDefs string

//go:embed spx_defs.md
var SpxDefs string

//go:embed custom_element_code_link.md
var customElementCodeLink string

//go:embed custom_element_code_change.md
var customElementCodeChange string

//go:embed workflow_system_prompt.md
var WorkflowSystemPromptTpl string

//go:embed code_system_prompt.md
var codeSystemPromptTpl string

// CodeSystemPrompt is the fully rendered system prompt used to instruct the code copilot.
// It is initialized during package initialization.
var CodeSystemPrompt string

// codeSystemPromptTplData holds all data needed to populate the system prompt template.
// This includes language definitions, documentation, and available tools.
type codeSystemPromptTplData struct {
	GopDefs                 string         // Go+ language documentation
	SpxDefs                 string         // SPX framework documentation
	CustomElementCodeLink   string         // Custom element code linking documentation
	CustomElementCodeChange string         // Custom element code change documentation
	Tools                   []Tool         // Available tools for the AI assistant
	Reference               *model.Project // Reference to the project model for context
}

// init initializes the package by:
// 1. Loading and parsing the tool definitions from embedded JSON
// 2. Preparing the template data with all documentation and tools
// 3. Rendering the system prompt template with the prepared data
// The function will panic if any step fails, as proper initialization is critical.
func SystemPromptWithTools(tools []Tool) string {
	// Create a new template with the provided tools
	tplData := codeSystemPromptTplData{
		GopDefs:                 GopDefs,
		SpxDefs:                 SpxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
		Tools:                   tools,
	}

	// Define template functions for formatting
	funcMap := template.FuncMap{
		"formatJSON": func(v any) string {
			indented, err := json.MarshalIndent(v, "", "\t")
			if err != nil {
				return fmt.Sprintf("Error formatting JSON: %v", err)
			}
			return string(indented)
		},
	}

	// Parse the system prompt template
	tpl, err := template.New("system-prompt").Funcs(funcMap).Parse(WorkflowSystemPromptTpl)
	if err != nil {
		panic(err)
	}

	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}

	return sb.String()
}

func init() {
	tplData := codeSystemPromptTplData{
		GopDefs:                 GopDefs,
		SpxDefs:                 SpxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
	}
	tpl, err := template.New("system-prompt").Parse(codeSystemPromptTpl)
	if err != nil {
		panic(err)
	}
	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}
	CodeSystemPrompt = sb.String()
}
