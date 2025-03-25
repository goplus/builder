package copilot

import (
	_ "embed"
	"encoding/json"
	"log"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/copilot/types"
)

// toolsDefs contains the JSON definition of available tools.
// The definitions are embedded from tools_defs.json at compile time.
//
//go:embed tools_defs.json
var toolsDefs string

// Tools is a global slice containing all available tool definitions.
// It is initialized at startup by parsing the embedded tools_defs.json file.
var Tools []types.Tool

// init initializes the Tools slice by parsing the embedded JSON definitions
// and performing validation checks on each tool definition.
// It will fatal if:
//   - The JSON parsing fails
//   - Any tool definition is missing a required name
//   - Any tool definition is missing a required description
func init() {
	// Remove any BOM marks and whitespace from the JSON string
	// This ensures clean parsing even if the file includes UTF-8 BOM
	cleanJSON := strings.TrimSpace(toolsDefs)

	// Parse the JSON data into the Tools slice
	// This populates the global Tools variable with all tool definitions
	err := json.Unmarshal([]byte(cleanJSON), &Tools)
	if err != nil {
		log.Fatalf("Failed to parse tools definitions: %v", err)
	}

	// Validate each tool definition to ensure it contains
	// the required name and description fields
	for i, tool := range Tools {
		if tool.F.Name == "" {
			log.Fatalf("Tool at index %d has no name", i)
		}
		if tool.F.Description == "" {
			log.Fatalf("Tool %q has no description", tool.F.Name)
		}
	}
}
