package migrator

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// validate verifies that a project builds against the specified spx version.
func validate(files map[string][]byte, spxVersion string) error {
	// Create a temporary directory.
	tempDir, err := os.MkdirTemp("", "spx-migration-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write all files to the temporary directory.
	for path, content := range files {
		fullPath := filepath.Join(tempDir, path)
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("failed to create dir %s for file %s: %w", dir, path, err)
		}
		if err := os.WriteFile(fullPath, content, 0o644); err != nil {
			return fmt.Errorf("failed to write file %s: %w", path, err)
		}
	}

	// Create a go.mod file with the specified spx version.
	goModContent := fmt.Sprintf(`module temp-spx-project

go 1.23.0

require github.com/goplus/spx/v2 %s //xgo:class
`, spxVersion)
	if err := os.WriteFile(filepath.Join(tempDir, "go.mod"), []byte(goModContent), 0o644); err != nil {
		return fmt.Errorf("failed to write go.mod: %w", err)
	}

	// Run xgo mod tidy to validate dependencies and basic structure.
	cmd := exec.Command("xgo", "mod", "tidy")
	cmd.Dir = tempDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to type-check project: %s", string(output))
	}

	return nil
}
