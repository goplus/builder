package main

import (
	"os"

	"github.com/goplus/builder/spx-backend/internal/copilot"
)

func main() {
	// Generate CLAUDE.md content
	content := copilot.GenerateClaudeSystemPrompt()

	// Set output file path in current working directory
	outputPath := "./CLAUDE.md"

	// Write file
	if err := os.WriteFile(outputPath, []byte(content), 0644); err != nil {
		panic(err)
	}
}
