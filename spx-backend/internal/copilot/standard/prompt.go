package standard

import (
	_ "embed"
	"strings"
	"text/template"
)

// For details about maintaining `xgo_syntax.md` & `spx_apis.md`, see:
// spx-gui/src/components/editor/code-editor/document-base/helpers.ts

//go:embed about_xgo.md
var AboutXGo string

//go:embed xgo_syntax.md
var XGoSyntax string

//go:embed about_spx.md
var AboutSpx string

//go:embed spx_apis.md
var SpxAPIs string

//go:embed about_xbuilder.md
var AboutXBuilder string

//go:embed system_prompt.md
var systemPromptTpl string

// SystemPrompt is the fully rendered system prompt used to instruct the AI assistant.
// It is initialized during package initialization.
var SystemPrompt string

// systemPromptTplData holds all data needed to populate the system prompt template.
// This includes language definitions, documentation, and available tools.
type systemPromptTplData struct {
	AboutXGo      string
	XGoSyntax     string
	AboutSpx      string
	SpxAPIs       string
	AboutXBuilder string
}

func init() {
	tplData := systemPromptTplData{
		AboutXGo:      AboutXGo,
		XGoSyntax:     XGoSyntax,
		AboutSpx:      AboutSpx,
		SpxAPIs:       SpxAPIs,
		AboutXBuilder: AboutXBuilder,
	}
	tpl, err := template.New("system-prompt").Parse(systemPromptTpl)
	if err != nil {
		panic(err)
	}
	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}
	SystemPrompt = sb.String()
}
