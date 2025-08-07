package main

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"path"
	"strings"

	"github.com/goplus/xgo/ast"
	"github.com/goplus/xgo/format"
	"github.com/goplus/xgo/parser"
	"github.com/goplus/xgo/token"
)

// ProcessSpxProject removes auto-binding declarations from spx project files.
// It accepts a map of file paths to file contents and returns the modified files.
// The function modifies the input map in-place.
func ProcessSpxProject(files map[string][]byte, verbose bool) error {
	proj := &spxProject{
		files:      files,
		assetsPath: "assets",
		fset:       token.NewFileSet(),
	}

	// Find main.spx file.
	for name := range files {
		if strings.HasSuffix(name, "/main.spx") || name == "main.spx" {
			proj.mainFile = name
			break
		}
	}

	if proj.mainFile == "" {
		return fmt.Errorf("no main.spx file found in the project")
	}

	// Load resources.
	if err := proj.loadResources(); err != nil {
		if verbose {
			log.Printf("Warning: failed to load resources: %v", err)
		}
	}

	// Parse all spx files to validate the project.
	if err := proj.parseAllFiles(verbose); err != nil {
		return fmt.Errorf("project validation failed: %w", err)
	}

	// Process main.spx to remove auto-bindings.
	mainAST := proj.astFiles[proj.mainFile]
	modified, removedCount, err := proj.removeAutoBindings(mainAST, verbose)
	if err != nil {
		return fmt.Errorf("failed to remove auto-bindings: %w", err)
	}

	if removedCount > 0 {
		proj.files[proj.mainFile] = modified
		if verbose {
			log.Printf("Removed %d auto-binding declaration(s) from %s", removedCount, proj.mainFile)
		}
	} else {
		if verbose {
			log.Printf("No auto-bindings found in %s", proj.mainFile)
		}
	}

	return nil
}

type spxProject struct {
	files      map[string][]byte
	mainFile   string
	assetsPath string
	resources  *spxResourceSet
	fset       *token.FileSet
	astFiles   map[string]*ast.File
}

type spxResourceSet struct {
	sounds  map[string]bool
	sprites map[string]bool
}

func (p *spxProject) loadResources() error {
	p.resources = &spxResourceSet{
		sounds:  make(map[string]bool),
		sprites: make(map[string]bool),
	}

	// Load sounds.
	soundsPath := path.Join(p.assetsPath, "sounds")
	for name := range p.files {
		if strings.HasPrefix(name, soundsPath+"/") && strings.HasSuffix(name, "/index.json") {
			parts := strings.Split(name, "/")
			if len(parts) >= 3 {
				soundName := parts[len(parts)-2]
				p.resources.sounds[soundName] = true
			}
		}
	}

	// Load sprites.
	spritesPath := path.Join(p.assetsPath, "sprites")
	for name := range p.files {
		if strings.HasPrefix(name, spritesPath+"/") && strings.HasSuffix(name, "/index.json") {
			parts := strings.Split(name, "/")
			if len(parts) >= 3 {
				spriteName := parts[len(parts)-2]
				p.resources.sprites[spriteName] = true
			}
		}
	}

	return nil
}

func (p *spxProject) parseAllFiles(verbose bool) error {
	p.astFiles = make(map[string]*ast.File)
	parseErrors := make([]error, 0)

	// Parse all .spx files.
	for name, content := range p.files {
		if strings.HasSuffix(name, ".spx") {
			mode := parser.ParseComments
			// Non-main .spx files are sprite classes.
			if name != p.mainFile {
				mode |= parser.ParseGoPlusClass
			}

			f, err := parser.ParseFile(p.fset, name, content, mode)
			if err != nil {
				parseErrors = append(parseErrors, fmt.Errorf("failed to parse %s: %w", name, err))
				continue
			}

			p.astFiles[name] = f
		}
	}

	// Report all parse errors.
	if len(parseErrors) > 0 {
		errMsg := "parsing errors:\n"
		for _, err := range parseErrors {
			errMsg += "  - " + err.Error() + "\n"
		}
		return errors.New(errMsg)
	}

	if len(p.astFiles) == 0 {
		return errors.New("no .spx files found in the project")
	}

	if verbose {
		log.Printf("Successfully parsed %d .spx file(s)", len(p.astFiles))
	}

	return nil
}

func (p *spxProject) removeAutoBindings(f *ast.File, verbose bool) ([]byte, int, error) {
	// Find custom sprite types in main.spx.
	customSpriteTypes := p.findCustomSpriteTypes(f, verbose)

	// Find the first var block in the file.
	var firstVarDecl *ast.GenDecl
	for _, decl := range f.Decls {
		if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.VAR {
			firstVarDecl = genDecl
			break
		}
	}

	if firstVarDecl == nil {
		// No var declarations found.
		var buf bytes.Buffer
		if err := format.Node(&buf, p.fset, f); err != nil {
			return nil, 0, fmt.Errorf("failed to format code: %w", err)
		}
		return buf.Bytes(), 0, nil
	}

	// Collect all auto-binding variables to remove.
	// Use a map to track variable names to remove.
	toRemove := make(map[*ast.Ident]bool)

	// Only process variables in the first var block.
	for _, spec := range firstVarDecl.Specs {
		valueSpec, ok := spec.(*ast.ValueSpec)
		if !ok {
			continue
		}

		// Skip if it has initialization values (not auto-binding).
		if len(valueSpec.Values) > 0 {
			continue
		}

		// Check each variable name in the declaration.
		for _, nameIdent := range valueSpec.Names {
			varName := nameIdent.Name
			isAutoBinding := false

			if valueSpec.Type != nil {
				// Explicit type case: var name Type
				typeName := ""

				// Handle both simple and qualified type names.
				switch t := valueSpec.Type.(type) {
				case *ast.Ident:
					// Simple type: Sound, Sprite, CustomType
					typeName = t.Name
				case *ast.SelectorExpr:
					// Qualified type: spx.Sound, spx.Sprite
					if x, ok := t.X.(*ast.Ident); ok {
						// Check if it's spx.Sound or spx.Sprite
						if x.Name == "spx" && t.Sel != nil {
							typeName = t.Sel.Name
						}
					}
				}

				// Check for auto-binding based on type.
				switch typeName {
				case "Sound":
					if p.resources.sounds[varName] {
						isAutoBinding = true
						if verbose {
							log.Printf("  Found Sound auto-binding: %s", varName)
						}
					}
				case "Sprite":
					if p.resources.sprites[varName] {
						isAutoBinding = true
						if verbose {
							log.Printf("  Found Sprite auto-binding: %s", varName)
						}
					}
				default:
					// Check custom sprite type.
					if customSpriteTypes[typeName] && typeName == varName && p.resources.sprites[varName] {
						isAutoBinding = true
						if verbose {
							log.Printf("  Found custom sprite auto-binding: %s", varName)
						}
					}
				}
			}

			if isAutoBinding {
				toRemove[nameIdent] = true
			}
		}
	}

	if len(toRemove) == 0 {
		// No auto-bindings found, return original content.
		var buf bytes.Buffer
		if err := format.Node(&buf, p.fset, f); err != nil {
			return nil, 0, fmt.Errorf("failed to format code: %w", err)
		}
		return buf.Bytes(), 0, nil
	}

	// Remove auto-binding variables from the first var block.
	removedCount := len(toRemove)
	newSpecs := make([]ast.Spec, 0)

	for _, spec := range firstVarDecl.Specs {
		valueSpec, ok := spec.(*ast.ValueSpec)
		if !ok {
			newSpecs = append(newSpecs, spec)
			continue
		}

		// Check if any variable in this spec should be removed.
		newNames := make([]*ast.Ident, 0)
		newTypes := valueSpec.Type

		for _, name := range valueSpec.Names {
			if !toRemove[name] {
				newNames = append(newNames, name)
			}
		}

		// If some variables remain, keep the spec with remaining variables.
		if len(newNames) > 0 {
			newSpec := &ast.ValueSpec{
				Doc:     valueSpec.Doc,
				Names:   newNames,
				Type:    newTypes,
				Values:  valueSpec.Values,
				Comment: valueSpec.Comment,
			}
			newSpecs = append(newSpecs, newSpec)
		}
		// If all variables were removed, skip this spec entirely.
	}

	// Update or remove the var declaration.
	if len(newSpecs) == 0 {
		// Remove the entire var block.
		var newDecls []ast.Decl
		for _, decl := range f.Decls {
			if decl != firstVarDecl {
				newDecls = append(newDecls, decl)
			}
		}
		f.Decls = newDecls
	} else {
		// Update the var block.
		firstVarDecl.Specs = newSpecs
	}

	// Format and return the modified code.
	var buf bytes.Buffer
	if err := format.Node(&buf, p.fset, f); err != nil {
		return nil, 0, fmt.Errorf("failed to format code: %w", err)
	}

	return buf.Bytes(), removedCount, nil
}

func (p *spxProject) findCustomSpriteTypes(f *ast.File, verbose bool) map[string]bool {
	customTypes := make(map[string]bool)

	// Look for type declarations that might be custom sprite types.
	for _, decl := range f.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.TYPE {
			continue
		}

		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}

			// Check if it's a struct type.
			structType, ok := typeSpec.Type.(*ast.StructType)
			if !ok {
				continue
			}

			// Check if it embeds Sprite.
			for _, field := range structType.Fields.List {
				// Embedded field has no names.
				if len(field.Names) == 0 {
					if ident, ok := field.Type.(*ast.Ident); ok && ident.Name == "Sprite" {
						customTypes[typeSpec.Name.Name] = true
						if verbose {
							log.Printf("Found custom sprite type: %s", typeSpec.Name.Name)
						}
						break
					}
				}
			}
		}
	}

	return customTypes
}
