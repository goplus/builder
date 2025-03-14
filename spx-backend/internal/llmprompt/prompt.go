package llmprompt

import (
	_ "embed"
	"strings"
	"text/template"
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

//go:embed system_prompt.md
var systemPromptTpl string

//go:embed check_code_prompt.md
var checkCodePromptTpl string

type systemPromptTplData struct {
	GopDefs                 string
	SpxDefs                 string
	CustomElementCodeLink   string
	CustomElementCodeChange string
}

var SystemPrompt string

type checkCodePromptTplData struct {
	GopDefs string
	SpxDefs string
}

var CheckCodePrompt string

func parseTemplate(tplData interface{}, tplStr string, resultVar *string) {
	tpl, err := template.New("prompt").Parse(tplStr)
	if err != nil {
		panic(err)
	}
	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}
	*resultVar = sb.String()
}

func init() {
	tplData := systemPromptTplData{
		GopDefs:                 gopDefs,
		SpxDefs:                 spxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
	}
	parseTemplate(tplData, systemPromptTpl, &SystemPrompt)

	checkCodeTplData := checkCodePromptTplData{
		GopDefs: gopDefs,
		SpxDefs: spxDefs,
	}
	parseTemplate(checkCodeTplData, checkCodePromptTpl, &CheckCodePrompt)
}
