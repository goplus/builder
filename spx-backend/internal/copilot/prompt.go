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

type systemPromptTplData struct {
	GopDefs                 string
	SpxDefs                 string
	CustomElementCodeLink   string
	CustomElementCodeChange string
	Tools                   []types.Tool
}

var SystemPrompt string

func init() {
	var tools []types.Tool
	if err := json.Unmarshal([]byte(toolsDefs), &tools); err != nil {
		panic(err)
	}
	tplData := systemPromptTplData{
		GopDefs:                 gopDefs,
		SpxDefs:                 spxDefs,
		CustomElementCodeLink:   customElementCodeLink,
		CustomElementCodeChange: customElementCodeChange,
		Tools:                   tools,
	}

	funcMap := template.FuncMap{
		"formatJSON": func(v interface{}) string {
			// 将 parameters 转换为缩进的 JSON 字符串
			indented, err := json.MarshalIndent(v, "    ", "  ")
			if err != nil {
				return fmt.Sprintf("Error formatting JSON: %v", err)
			}
			// 添加前导空格以保持缩进
			return string(indented)
		},
	}

	tpl, err := template.New("system-prompt").Funcs(funcMap).Parse(systemPromptTpl)
	if err != nil {
		panic(err)
	}
	var sb strings.Builder
	if err := tpl.Execute(&sb, tplData); err != nil {
		panic(err)
	}
	SystemPrompt = sb.String()
}
