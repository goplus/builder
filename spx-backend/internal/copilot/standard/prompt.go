package standard

//go:generate claudegen

import (
	_ "embed"
	"strings"
	"text/template"

	"github.com/goplus/builder/spx-backend/internal/embkb"
)

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
	AIInteraction string
}

func init() {
	tplData := systemPromptTplData{
		AboutXGo:      embkb.AboutXGo(),
		XGoSyntax:     embkb.XGoSyntax(),
		AboutSpx:      embkb.AboutSpx(),
		SpxAPIs:       embkb.SpxAPIs(),
		AboutXBuilder: embkb.AboutXBuilder(),
		AIInteraction: embkb.AIInteraction(),
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
