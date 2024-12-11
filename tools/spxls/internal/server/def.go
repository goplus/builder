package server

import (
	"errors"
	"fmt"
	"go/types"

	gopast "github.com/goplus/gop/ast"
	goptoken "github.com/goplus/gop/token"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_definition
func (s *Server) textDocumentDefinition(params *DefinitionParams) (any, error) {
	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, fmt.Errorf("failed to compile: %w", err)
	}

	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx file from document URI %q: %w", params.TextDocument.URI, err)
	}
	astFile, ok := result.mainPkgFiles[spxFile]
	if !ok {
		return nil, nil // No AST file found for the spx file, probably compile failed.
	}

	obj := result.objectAtFilePosition(astFile, params.Position)
	if obj == nil || obj.Pkg() == nil || obj.Pkg().Path() != "main" {
		return nil, nil
	}

	locations := s.findDefinitionLocations(result, obj)
	if len(locations) > 0 {
		locations = deduplicateLocations(locations)
		if len(locations) == 1 {
			return locations[0], nil
		}
		return locations, nil
	}
	return nil, nil
}

// findDefinitionLocations returns all locations where the given object is defined.
func (s *Server) findDefinitionLocations(result *compileResult, obj types.Object) []Location {
	var locations []Location
	for ident, objDef := range result.typeInfo.Defs {
		if objDef == obj {
			locations = append(locations, s.createLocation(result.fset, ident))
		}
	}
	return locations
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_references
func (s *Server) textDocumentReferences(params *ReferenceParams) ([]Location, error) {
	result, err := s.compile()
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil // No valid spx files found in workspace.
		}
		return nil, err
	}

	spxFile, err := s.fromDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to get spx file from document URI %q: %w", params.TextDocument.URI, err)
	}
	astFile, ok := result.mainPkgFiles[spxFile]
	if !ok {
		return nil, nil // No AST file found for the spx file, probably compile failed.
	}

	obj := result.objectAtFilePosition(astFile, params.Position)
	if obj == nil {
		return nil, nil
	}

	var locations []Location

	// Find all direct references.
	locations = append(locations, s.findReferenceLocations(result, obj)...)

	// Handle method references if it's a method.
	if fn, ok := obj.(*types.Func); ok && fn.Type().(*types.Signature).Recv() != nil {
		locations = append(locations, s.handleMethodReferences(result, fn)...)
		locations = append(locations, s.handleEmbeddedFieldReferences(result, obj)...)
	}

	// Include declarations if requested.
	if params.Context.IncludeDeclaration {
		locations = append(locations, s.findDefinitionLocations(result, obj)...)
	}

	return deduplicateLocations(locations), nil
}

// findReferenceLocations returns all locations where the given object is referenced.
func (s *Server) findReferenceLocations(result *compileResult, obj types.Object) []Location {
	var locations []Location
	for ident, objUse := range result.typeInfo.Uses {
		if objUse == obj {
			locations = append(locations, s.createLocation(result.fset, ident))
		}
	}
	return locations
}

// handleMethodReferences finds all references to a method, including interface implementations
// and interface method references.
func (s *Server) handleMethodReferences(result *compileResult, fn *types.Func) []Location {
	var locations []Location
	recvType := fn.Type().(*types.Signature).Recv().Type()
	if types.IsInterface(recvType) {
		iface, ok := recvType.(*types.Interface)
		if !ok {
			return nil
		}
		methodName := fn.Name()
		locations = append(locations, s.findEmbeddedInterfaceReferences(result, iface, methodName)...)
		locations = append(locations, s.findImplementingMethodReferences(result, iface, methodName)...)
	} else {
		locations = append(locations, s.findInterfaceMethodReferences(result, fn)...)
	}
	return locations
}

// findEmbeddedInterfaceReferences finds references to methods in interfaces that embed the given interface.
func (s *Server) findEmbeddedInterfaceReferences(result *compileResult, iface *types.Interface, methodName string) []Location {
	var locations []Location
	seen := make(map[*types.Interface]bool) // Avoid cycles in interface embedding.

	var findEmbedded func(*types.Interface)
	findEmbedded = func(current *types.Interface) {
		if seen[current] {
			return
		}
		seen[current] = true

		// Find all interfaces that embed this interface.
		for _, file := range result.mainPkgFiles {
			for _, decl := range file.Decls {
				typeDecl, ok := decl.(*gopast.GenDecl)
				if !ok || typeDecl.Tok != goptoken.TYPE {
					continue
				}

				for _, spec := range typeDecl.Specs {
					typeSpec, ok := spec.(*gopast.TypeSpec)
					if !ok {
						continue
					}

					typeName := result.typeInfo.ObjectOf(typeSpec.Name)
					if typeName == nil {
						continue
					}

					embedIface, ok := typeName.Type().Underlying().(*types.Interface)
					if !ok {
						continue
					}

					// Check direct embedding.
					for i := 0; i < embedIface.NumEmbeddeds(); i++ {
						if types.Identical(embedIface.EmbeddedType(i), current) {
							// Find the method in the embedding interface.
							method, index, _ := types.LookupFieldOrMethod(embedIface, false, typeName.Pkg(), methodName)
							if method != nil && index != nil {
								locations = append(locations, s.findReferenceLocations(result, method)...)
							}
							// Recursively check interfaces that embed this one.
							findEmbedded(embedIface)
						}
					}
				}
			}
		}
	}

	findEmbedded(iface)
	return locations
}

// findImplementingMethodReferences finds references to all methods that implement the given interface method.
func (s *Server) findImplementingMethodReferences(result *compileResult, iface *types.Interface, methodName string) []Location {
	var locations []Location

	// Find all types that implement this interface.
	for _, file := range result.mainPkgFiles {
		for _, decl := range file.Decls {
			typeDecl, ok := decl.(*gopast.GenDecl)
			if !ok || typeDecl.Tok != goptoken.TYPE {
				continue
			}

			for _, spec := range typeDecl.Specs {
				typeSpec, ok := spec.(*gopast.TypeSpec)
				if !ok {
					continue
				}

				typeName := result.typeInfo.ObjectOf(typeSpec.Name)
				if typeName == nil {
					continue
				}

				named, ok := typeName.Type().(*types.Named)
				if !ok {
					continue
				}

				if !types.Implements(named, iface) {
					continue
				}

				// Find references to implementing methods.
				method, index, _ := types.LookupFieldOrMethod(named, false, named.Obj().Pkg(), methodName)
				if method == nil || index == nil {
					continue
				}

				// Add references to the implementing method.
				locations = append(locations, s.findReferenceLocations(result, method)...)
			}
		}
	}
	return locations
}

// findInterfaceMethodReferences finds references to interface methods that this method implements,
// including methods from embedded interfaces.
func (s *Server) findInterfaceMethodReferences(result *compileResult, fn *types.Func) []Location {
	var locations []Location
	recvType := fn.Type().(*types.Signature).Recv().Type()
	seen := make(map[*types.Interface]bool) // Avoid cycles in interface checking.

	// Find all interface types.
	for _, file := range result.mainPkgFiles {
		for _, decl := range file.Decls {
			typeDecl, ok := decl.(*gopast.GenDecl)
			if !ok || typeDecl.Tok != goptoken.TYPE {
				continue
			}

			for _, spec := range typeDecl.Specs {
				typeSpec, ok := spec.(*gopast.TypeSpec)
				if !ok {
					continue
				}

				typeName := result.typeInfo.ObjectOf(typeSpec.Name)
				if typeName == nil {
					continue
				}

				ifaceType, ok := typeName.Type().Underlying().(*types.Interface)
				if !ok {
					continue
				}

				if seen[ifaceType] {
					continue
				}
				seen[ifaceType] = true

				// Check if the receiver type implements this interface.
				if !types.Implements(recvType, ifaceType) {
					continue
				}

				// Find the interface method.
				method, index, _ := types.LookupFieldOrMethod(ifaceType, false, typeName.Pkg(), fn.Name())
				if method == nil || index == nil {
					continue
				}

				// Add references to the interface method.
				locations = append(locations, s.findReferenceLocations(result, method)...)

				// Also check interfaces that embed this interface.
				locations = append(locations, s.findEmbeddedInterfaceReferences(result, ifaceType, fn.Name())...)
			}
		}
	}
	return locations
}

// handleEmbeddedFieldReferences finds all references through embedded fields.
func (s *Server) handleEmbeddedFieldReferences(result *compileResult, obj types.Object) []Location {
	var locations []Location

	// If it's a method, we need to find all calls through embedded fields.
	if fn, ok := obj.(*types.Func); ok {
		recv := fn.Type().(*types.Signature).Recv()
		if recv == nil {
			return nil // Not a method.
		}
		recvType := recv.Type()

		// Keep track of processed types to avoid infinite recursion.
		seen := make(map[types.Type]bool)

		// Find all types that embed the receiver type (directly or indirectly).
		for _, file := range result.mainPkgFiles {
			for _, decl := range file.Decls {
				typeDecl, ok := decl.(*gopast.GenDecl)
				if !ok || typeDecl.Tok != goptoken.TYPE {
					continue
				}

				for _, spec := range typeDecl.Specs {
					typeSpec, ok := spec.(*gopast.TypeSpec)
					if !ok {
						continue
					}

					typeName := result.typeInfo.ObjectOf(typeSpec.Name)
					if typeName == nil {
						continue
					}
					named, ok := typeName.Type().(*types.Named)
					if !ok {
						continue
					}

					locations = append(locations, s.findEmbeddedMethodReferences(result, fn, named, recvType, seen)...)
				}
			}
		}
	}
	return locations
}

// findEmbeddedMethodReferences recursively finds all references to a method through embedded fields.
func (s *Server) findEmbeddedMethodReferences(result *compileResult, fn *types.Func, named *types.Named, targetType types.Type, seen map[types.Type]bool) []Location {
	if seen[named] {
		return nil
	}
	seen[named] = true

	var locations []Location

	st, ok := named.Underlying().(*types.Struct)
	if !ok {
		return nil
	}

	// Check direct embedding.
	hasEmbed := false
	for i := 0; i < st.NumFields(); i++ {
		field := st.Field(i)
		if !field.Embedded() {
			continue
		}

		// Check if this field embeds our target type.
		if types.Identical(field.Type(), targetType) {
			hasEmbed = true
			// Find method through embedding.
			method, _, _ := types.LookupFieldOrMethod(named, false, fn.Pkg(), fn.Name())
			if method != nil {
				locations = append(locations, s.findReferenceLocations(result, method)...)
			}
		}

		// Recursively check types that embed this field.
		if fieldNamed, ok := field.Type().(*types.Named); ok {
			locations = append(locations, s.findEmbeddedMethodReferences(result, fn, fieldNamed, targetType, seen)...)
		}
	}

	// If this type embeds our target type (directly or indirectly), other
	// types might embed this type to get the method.
	if hasEmbed {
		for _, file := range result.mainPkgFiles {
			for _, decl := range file.Decls {
				typeDecl, ok := decl.(*gopast.GenDecl)
				if !ok || typeDecl.Tok != goptoken.TYPE {
					continue
				}

				for _, spec := range typeDecl.Specs {
					typeSpec, ok := spec.(*gopast.TypeSpec)
					if !ok {
						continue
					}

					typeName := result.typeInfo.ObjectOf(typeSpec.Name)
					if typeName == nil {
						continue
					}
					if embedNamed, ok := typeName.Type().(*types.Named); ok {
						locations = append(locations, s.findEmbeddedMethodReferences(result, fn, embedNamed, named, seen)...)
					}
				}
			}
		}
	}

	return locations
}
