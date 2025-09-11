package aiinteraction

import _ "embed"

var (
	// systemPrompt is the embedded system prompt.
	//
	//go:embed system_prompt.md
	systemPrompt string

	// archiveSystemPrompt is the embedded archive system prompt.
	//
	//go:embed archive_system_prompt.md
	archiveSystemPrompt string
)
