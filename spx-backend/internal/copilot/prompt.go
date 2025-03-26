package copilot

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
)

// For details about maintaining `*_defs.md` files, see:
// spx-gui/src/components/editor/code-editor/document-base/helpers.ts

//go:embed gop_defs.md
var gopDefs string

//go:embed spx_defs.md
var spxDefs string

//go:embed custom_element_code_link.md
var customElementCodeLink string

//go:embed custom_element_code_change.md
var customElementCodeChange string

//go:embed tools_defs.json
var toolsDefs string

//go:embed system_prompt.md
var systemPromptTpl string

// systemPromptTplData holds all data needed to populate the system prompt template.
// This includes language definitions, documentation, and available tools.
type systemPromptTplData struct {
	GopDefs                 string       // Go+ language documentation
	SpxDefs                 string       // SPX framework documentation
	CustomElementCodeLink   string       // Custom element code linking documentation
	CustomElementCodeChange string       // Custom element code change documentation
	Tools                   []types.Tool // Available tools for the AI assistant
}

// SystemPrompt is the fully rendered system prompt used to instruct the AI assistant.
// It is initialized during package initialization.
var SystemPrompt string

// init initializes the package by:
// 1. Loading and parsing the tool definitions from embedded JSON
// 2. Preparing the template data with all documentation and tools
// 3. Rendering the system prompt template with the prepared data
// The function will panic if any step fails, as proper initialization is critical.
func init() {
	// Parse tool definitions from embedded JSON
	var tools []types.Tool
	if err := json.Unmarshal([]byte(toolsDefs), &tools); err != nil {
		panic(err)
	}

	// Prepare template data with all documentation and tools
	tplData := systemPromptTplData{
		GopDefs:                 gopDefs,
		SpxDefs:                 spxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
		Tools:                   tools,
	}

	// Define template functions for formatting
	funcMap := template.FuncMap{
		// formatJSON converts a Go value to a properly indented JSON string
		// This is used to format tool parameters in a readable format
		"formatJSON": func(v interface{}) string {
			indented, err := json.MarshalIndent(v, "    ", "  ")
			if err != nil {
				return fmt.Sprintf("Error formatting JSON: %v", err)
			}
			return string(indented)
		},
	}

	// Parse the system prompt template
	tpl, err := template.New("system-prompt").Funcs(funcMap).Parse(systemPromptTpl)
	if err != nil {
		panic(err)
	}

	// Execute the template with the prepared data
	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}

	// Store the fully rendered system prompt
	SystemPrompt = sb.String()
}
