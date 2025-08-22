package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	xgoast "github.com/goplus/xgo/ast"
	xgoformat "github.com/goplus/xgo/format"
	xgoparser "github.com/goplus/xgo/parser"
	xgotoken "github.com/goplus/xgo/token"
)

// Migrator handles the migration process.
type Migrator struct {
	files     map[string][]byte
	resources *ResourceSet
	fset      *xgotoken.FileSet
	tempDir   string
}

// ResourceSet contains the project's resource information.
type ResourceSet struct {
	sounds  map[string]bool // sound name -> exists
	sprites map[string]bool // sprite class name -> exists
}

// MigrationResult contains the result of the migration.
type MigrationResult struct {
	Success             bool
	SoundCallsConverted int
	AutoBindingsRemoved int
	Errors              []string
	Warnings            []string
}

// NewMigrator creates a new migrator instance.
func NewMigrator() *Migrator {
	return &Migrator{
		files: make(map[string][]byte),
		fset:  xgotoken.NewFileSet(),
	}
}

// Migrate performs the complete migration process.
func (m *Migrator) Migrate(inputPath string) (*MigrationResult, error) {
	result := &MigrationResult{}

	// Step 1: Extract ZIP to virtual file system
	fmt.Printf("  Extracting project archive...\n")
	if err := m.extractZip(inputPath); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to extract ZIP: %v", err))
		return result, err
	}

	// Step 2: Scan resources (only supports assets/ directory structure)
	fmt.Printf("  Scanning project resources...\n")
	resources, err := m.scanResources()
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Resource scanning failed: %v", err))
		return result, err
	}
	m.resources = resources
	m.PrintStatus()

	// Step 3: Pre-migration validation (using original spx version)
	fmt.Printf("  Validating project (before migration)...\n")
	if err := m.validateBefore(); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Pre-migration validation failed: %v", err))
		return result, err
	}
	fmt.Printf("    Project validation passed\n")

	// Step 4: Convert sound calls (Phase 1)
	fmt.Printf("  Converting sound calls to string literals...\n")
	soundConverted, err := m.convertSoundCalls()
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Sound conversion failed: %v", err))
		return result, err
	}
	result.SoundCallsConverted = soundConverted
	fmt.Printf("    Converted %d sound calls\n", soundConverted)

	// Step 5: Remove auto-binding declarations (Phase 2)
	fmt.Printf("  Removing auto-binding variable declarations...\n")
	bindingsRemoved, err := m.removeAutoBindings()
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Auto-binding removal failed: %v", err))
		return result, err
	}
	result.AutoBindingsRemoved = bindingsRemoved
	fmt.Printf("    Removed %d auto-binding declarations\n", bindingsRemoved)

	// Step 6: Post-migration validation (using fork version without auto-binding)
	fmt.Printf("  Validating project (after migration)...\n")
	if err := m.validateAfter(); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Post-migration validation failed: %v", err))
		return result, err
	}
	fmt.Printf("    Post-migration validation passed\n")

	result.Success = true
	return result, nil
}

// extractZip extracts a ZIP file to the virtual file system.
func (m *Migrator) extractZip(inputPath string) error {
	data, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("failed to read input file: %w", err)
	}

	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return fmt.Errorf("failed to open ZIP: %w", err)
	}

	m.files = make(map[string][]byte)
	for _, file := range r.File {
		// Skip directory entries
		if strings.HasSuffix(file.Name, "/") || file.FileInfo().IsDir() {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			return fmt.Errorf("failed to open file %s: %w", file.Name, err)
		}

		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return fmt.Errorf("failed to read file %s: %w", file.Name, err)
		}

		m.files[file.Name] = content
	}

	return nil
}

// scanResources scans the project for sound and sprite resources.
// Only supports assets/ directory structure. Returns error if assets/ not found.
func (m *Migrator) scanResources() (*ResourceSet, error) {
	rs := &ResourceSet{
		sounds:  make(map[string]bool),
		sprites: make(map[string]bool),
	}

	// Verify assets/ directory exists
	hasAssets := false
	for path := range m.files {
		if strings.HasPrefix(path, "assets/") {
			hasAssets = true
			break
		}
	}
	if !hasAssets {
		return nil, fmt.Errorf("unsupported project structure: assets/ directory not found")
	}

	// Scan sound resources from assets/sounds/*/index.json
	for path := range m.files {
		if strings.HasPrefix(path, "assets/sounds/") && strings.HasSuffix(path, "/index.json") {
			// Extract sound name: assets/sounds/soundName/index.json -> soundName
			parts := strings.Split(path, "/")
			if len(parts) >= 4 && parts[0] == "assets" && parts[1] == "sounds" {
				soundName := parts[2]
				if soundName != "" {
					rs.sounds[soundName] = true
				}
			}
		}
	}

	// Scan sprite classes from .spx files (excluding main.spx)
	for path := range m.files {
		if strings.HasSuffix(path, ".spx") && !strings.HasSuffix(path, "/main.spx") && path != "main.spx" {
			spriteName := strings.TrimSuffix(filepath.Base(path), ".spx")
			if spriteName != "" {
				rs.sprites[spriteName] = true
			}
		}
	}

	return rs, nil
}

// validateBefore performs type checking validation before migration.
// Uses original spx version that supports auto-binding.
func (m *Migrator) validateBefore() error {
	return m.validateWithGoMod(`module temp-spx-project

go 1.23.0

require github.com/goplus/spx/v2 v2.0.0-pre.5 //xgo:class
`)
}

// validateAfter performs type checking validation after migration.
// Uses fork version that removed auto-binding support.
func (m *Migrator) validateAfter() error {
	return m.validateWithGoMod(`module temp-spx-project

go 1.23.0

require github.com/goplus/spx/v2 v2.0.0-pre.5 //xgo:class

replace github.com/goplus/spx/v2 => github.com/aofei/fork.goplus.spx/v2 v2.0.0-20250819092900-241e7506ace2
`)
}

// validateWithGoMod performs type checking validation with the given go.mod content.
func (m *Migrator) validateWithGoMod(goModContent string) error {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "spx-migration-*")
	if err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write all files to temp directory
	for path, content := range m.files {
		fullPath := filepath.Join(tempDir, path)
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return fmt.Errorf("failed to create dir %s for file %s: %w", dir, path, err)
		}
		if err := os.WriteFile(fullPath, content, 0o644); err != nil {
			return fmt.Errorf("failed to write file %s: %w", path, err)
		}
	}

	// Create go.mod file
	if err := os.WriteFile(filepath.Join(tempDir, "go.mod"), []byte(goModContent), 0o644); err != nil {
		return fmt.Errorf("failed to write go.mod: %w", err)
	}

	// Run xgo mod tidy to validate dependencies and basic structure
	cmd := exec.Command("xgo", "mod", "tidy")
	cmd.Dir = tempDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("type check failed: %s", string(output))
	}

	return nil
}

// convertSoundCalls converts sound variable references to string literals.
func (m *Migrator) convertSoundCalls() (int, error) {
	converted := 0

	for path, content := range m.files {
		if !strings.HasSuffix(path, ".spx") {
			continue
		}

		// Parse the file
		file, err := xgoparser.ParseFile(m.fset, path, content, xgoparser.ParseComments)
		if err != nil {
			continue // Skip unparseable files
		}

		modified := false

		// Walk through AST to find and convert sound calls
		xgoast.Inspect(file, func(n xgoast.Node) bool {
			if call, ok := n.(*xgoast.CallExpr); ok {
				if m.isPlayFunction(call) && len(call.Args) > 0 {
					// Convert the first argument if it's a sound identifier
					if m.convertSoundArgument(call) {
						modified = true
						converted++
					}
				}
			}
			return true
		})

		// Write back modified file if changed
		if modified {
			var buf bytes.Buffer
			if err := xgoformat.Node(&buf, m.fset, file); err != nil {
				return converted, fmt.Errorf("failed to format %s: %w", path, err)
			}
			m.files[path] = buf.Bytes()
		}
	}

	return converted, nil
}

// isPlayFunction checks if a call expression is a play function call.
// Handles all play method variants:
//  1. play(...) - standalone function
//  2. this.Play(...) - method call
//  3. sprite.Play(...) - method call
//  4. Play__0, Play__1, Play__2 - method overloads
func (m *Migrator) isPlayFunction(call *xgoast.CallExpr) bool {
	if ident, ok := call.Fun.(*xgoast.Ident); ok {
		// Standalone function call: play(...)
		name := strings.ToLower(ident.Name)
		return name == "play"
	}

	if sel, ok := call.Fun.(*xgoast.SelectorExpr); ok {
		// Method call: this.Play(...), sprite.Play(...), etc.
		name := strings.ToLower(sel.Sel.Name)
		// Match Play, play, Play__0, Play__1, Play__2
		return name == "play" || strings.HasPrefix(name, "play__")
	}

	return false
}

// convertSoundArgument converts a sound variable argument to string literal if applicable.
// Handles cases like: play(mySound) -> play("mySound")
// Returns true if conversion was performed.
func (m *Migrator) convertSoundArgument(call *xgoast.CallExpr) bool {
	if len(call.Args) == 0 {
		return false
	}

	// Only convert the first argument (the sound/media parameter)
	firstArg := call.Args[0]

	// Check if it's an identifier that refers to a sound resource
	if ident, ok := firstArg.(*xgoast.Ident); ok {
		if m.resources.sounds[ident.Name] {
			// Convert identifier to string literal
			call.Args[0] = &xgoast.BasicLit{
				Kind:  xgotoken.STRING,
				Value: fmt.Sprintf(`"%s"`, ident.Name),
			}
			return true
		}
	}

	return false
}

// removeAutoBindings removes auto-binding variable declarations from main.spx.
func (m *Migrator) removeAutoBindings() (int, error) {
	// Find main.spx file (may be in subdirectory)
	var mainPath string
	var mainContent []byte
	var exists bool

	for path, content := range m.files {
		if strings.HasSuffix(path, "/main.spx") || path == "main.spx" {
			mainPath = path
			mainContent = content
			exists = true
			break
		}
	}

	if !exists {
		return 0, fmt.Errorf("main.spx not found")
	}

	// Parse main.spx
	file, err := xgoparser.ParseFile(m.fset, "main.spx", mainContent, xgoparser.ParseComments)
	if err != nil {
		return 0, fmt.Errorf("failed to parse main.spx: %w", err)
	}

	// Find the first var declaration
	var firstVarDecl *xgoast.GenDecl
	for _, decl := range file.Decls {
		if genDecl, ok := decl.(*xgoast.GenDecl); ok && genDecl.Tok == xgotoken.VAR {
			firstVarDecl = genDecl
			break
		}
	}

	if firstVarDecl == nil {
		return 0, nil // No var declarations
	}

	// Identify auto-binding variables to remove
	removed := 0
	newSpecs := []xgoast.Spec{}

	for _, spec := range firstVarDecl.Specs {
		valueSpec, ok := spec.(*xgoast.ValueSpec)
		if !ok {
			newSpecs = append(newSpecs, spec)
			continue
		}

		// Skip if it has initialization values
		if len(valueSpec.Values) > 0 {
			newSpecs = append(newSpecs, spec)
			continue
		}

		// Check each variable in this spec
		newNames := []*xgoast.Ident{}
		for _, name := range valueSpec.Names {
			if !m.isAutoBinding(valueSpec, name.Name) {
				newNames = append(newNames, name)
			} else {
				removed++
			}
		}

		// Keep the spec if it has remaining variables
		if len(newNames) > 0 {
			valueSpec.Names = newNames
			newSpecs = append(newSpecs, valueSpec)
		}
	}

	// Update or remove the var declaration
	if len(newSpecs) == 0 {
		// Remove the entire var block
		newDecls := []xgoast.Decl{}
		for _, decl := range file.Decls {
			if decl != firstVarDecl {
				newDecls = append(newDecls, decl)
			}
		}
		file.Decls = newDecls
	} else {
		// Update the var block
		firstVarDecl.Specs = newSpecs
	}

	// Write back the modified file
	var buf bytes.Buffer
	if err := xgoformat.Node(&buf, m.fset, file); err != nil {
		return removed, fmt.Errorf("failed to format main.spx: %w", err)
	}
	m.files[mainPath] = buf.Bytes()

	return removed, nil
}

// isAutoBinding determines if a variable declaration is an auto-binding. It
// Handles all forms of auto-binding according to
// https://github.com/goplus/spx/issues/379:
//   - Sound: var sd1 Sound, var sd2 *Sound
//   - Sprite: var Sp1 Sp1, var Sp2 *Sp2, var Sp3 Sprite, var Sp4 *Sprite
func (m *Migrator) isAutoBinding(spec *xgoast.ValueSpec, varName string) bool {
	if spec.Type == nil {
		return false
	}

	baseTypeName, _ := m.getTypeNameAndPointer(spec.Type)

	// Sound auto-binding (2 forms)
	// 1. var sd1 Sound
	// 2. var sd2 *Sound
	if baseTypeName == "Sound" && m.resources.sounds[varName] {
		return true
	}

	// Sprite auto-binding (4 forms)
	if m.resources.sprites[varName] {
		// 1. var Sp1 Sp1 (type name matches variable name)
		// 2. var Sp2 *Sp2 (pointer type, type name matches variable name)
		if baseTypeName == varName {
			return true
		}

		// 3. var Sp3 Sprite (generic Sprite interface)
		// 4. var Sp4 *Sprite (pointer to generic Sprite interface)
		if baseTypeName == "Sprite" {
			return true
		}
	}

	return false
}

// getTypeNameAndPointer extracts the base type name and pointer status from a type expression.
func (m *Migrator) getTypeNameAndPointer(expr xgoast.Expr) (typeName string, isPointer bool) {
	switch t := expr.(type) {
	case *xgoast.Ident:
		return t.Name, false
	case *xgoast.SelectorExpr:
		if x, ok := t.X.(*xgoast.Ident); ok && x.Name == "spx" {
			return t.Sel.Name, false
		}
	case *xgoast.StarExpr:
		// Handle pointer types like *Sprite, *Sound
		baseType, _ := m.getTypeNameAndPointer(t.X)
		return baseType, true
	}
	return "", false
}

// WriteZip writes the modified files to a new ZIP file.
func (m *Migrator) WriteZip(outputPath string) error {
	var buf bytes.Buffer
	w := zip.NewWriter(&buf)

	for name, content := range m.files {
		wf, err := w.Create(name)
		if err != nil {
			return fmt.Errorf("failed to create file %s in ZIP: %w", name, err)
		}
		if _, err := wf.Write(content); err != nil {
			return fmt.Errorf("failed to write file %s to ZIP: %w", name, err)
		}
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close ZIP writer: %w", err)
	}

	return os.WriteFile(outputPath, buf.Bytes(), 0o644)
}

// PrintStatus prints the resource scanning results and project structure analysis.
func (m *Migrator) PrintStatus() {
	fmt.Printf("Project analysis:\n")
	fmt.Printf("  Sound resources: %d\n", len(m.resources.sounds))
	fmt.Printf("  Sprite classes: %d\n", len(m.resources.sprites))
	fmt.Printf("  Total files: %d\n", len(m.files))

	// Count file types
	spxFiles := 0
	assetFiles := 0
	for path := range m.files {
		if strings.HasSuffix(path, ".spx") {
			spxFiles++
		}
		if strings.HasPrefix(path, "assets/") {
			assetFiles++
		}
	}
	fmt.Printf("  SPX files: %d\n", spxFiles)
	fmt.Printf("  Asset files: %d\n", assetFiles)

	if len(m.resources.sounds) > 0 {
		fmt.Printf("  Sounds: %s\n", m.joinKeys(m.resources.sounds))
	}
	if len(m.resources.sprites) > 0 {
		fmt.Printf("  Sprites: %s\n", m.joinKeys(m.resources.sprites))
	}
}

// joinKeys joins map keys into a string.
func (m *Migrator) joinKeys(m2 map[string]bool) string {
	var keys []string
	for k := range m2 {
		keys = append(keys, k)
	}
	return strings.Join(keys, ", ")
}
