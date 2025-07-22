package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintf(os.Stderr, "spx legacy auto-binding remover\n")
		fmt.Fprintf(os.Stderr, "Migrates spx projects from auto-binding to XGo -embed feature\n\n")
		fmt.Fprintf(os.Stderr, "Usage: %s <project.zip>\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Output: <project>_migrated.zip\n")
		os.Exit(1)
	}

	inputPath := os.Args[1]
	outputPath := generateOutputPath(inputPath)

	fmt.Printf("spx migration tool\n")
	fmt.Printf("Input:  %s\n", inputPath)
	fmt.Printf("Output: %s\n", outputPath)
	fmt.Printf("\n")

	// Create and run migrator
	migrator := NewMigrator()

	// Perform migration with detailed progress tracking
	fmt.Printf("Starting migration process...\n")
	result, err := migrator.Migrate(inputPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Migration failed: %v\n", err)
		printErrors(result.Errors)
		os.Exit(1)
	}

	if !result.Success {
		fmt.Fprintf(os.Stderr, "Migration completed with errors:\n")
		printErrors(result.Errors)
		os.Exit(1)
	}

	// Write output
	fmt.Printf("  Writing migrated project archive...\n")
	if err := migrator.WriteZip(outputPath); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to write output: %v\n", err)
		os.Exit(1)
	}

	// Success!
	fmt.Printf("\nMigration completed successfully!\n")
	fmt.Printf("  Sound calls converted: %d\n", result.SoundCallsConverted)
	fmt.Printf("  Auto-bindings removed: %d\n", result.AutoBindingsRemoved)
	fmt.Printf("  Output file: %s\n", outputPath)
}

// generateOutputPath generates the output file path.
func generateOutputPath(inputPath string) string {
	ext := filepath.Ext(inputPath)
	base := strings.TrimSuffix(inputPath, ext)
	return base + "_migrated" + ext
}

// printErrors prints error messages.
func printErrors(errors []string) {
	for _, err := range errors {
		fmt.Fprintf(os.Stderr, "   - %s\n", err)
	}
}
