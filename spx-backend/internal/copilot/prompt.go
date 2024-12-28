package copilot

import (
	_ "embed"
	"strings"
	"text/template"
)

// For details about maintaining `*_defs.json` files, see:
// spx-gui/src/components/editor/code-editor/document-base/helpers.ts

//go:embed gop_defs.json
var gopDefs string

//go:embed spx_defs.json
var spxDefs string

//go:embed custom_element_code_link.md
var customElementCodeLink string

//go:embed custom_element_code_change.md
var customElementCodeChange string

//go:embed system_prompt.md
var systemPromptTpl string

type systemPromptTplData struct {
	GopDefs                 string
	SpxDefs                 string
	CustomElementCodeLink   string
	CustomElementCodeChange string
}

var SystemPrompt string

func init() {
	tplData := systemPromptTplData{
		GopDefs:                 gopDefs,
		SpxDefs:                 spxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
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
