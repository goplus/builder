package server

import (
	"errors"
	"go/types"

	gopast "github.com/goplus/gop/ast"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_references
func (s *Server) textDocumentReferences(params *ReferenceParams) ([]Location, error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		if errors.Is(err, errNoValidSpxFiles) || errors.Is(err, errNoMainSpxFile) {
			return nil, nil
		}
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}

	obj := result.typeInfo.ObjectOf(result.identAtASTFilePosition(astFile, params.Position))
	if obj == nil {
		return nil, nil
	}

	var locations []Location

	locations = append(locations, s.findReferenceLocations(result, obj)...)

	if fn, ok := obj.(*types.Func); ok && fn.Type().(*types.Signature).Recv() != nil {
		locations = append(locations, s.handleMethodReferences(result, fn)...)
		locations = append(locations, s.handleEmbeddedFieldReferences(result, obj)...)
	}

	if params.Context.IncludeDeclaration {
		defIdent := result.defIdentFor(obj)
		if defIdent != nil && result.isInFset(defIdent.Pos()) {
			locations = append(locations, s.createLocationFromIdent(result.fset, defIdent))
		}
	}

	return deduplicateLocations(locations), nil
}

// findReferenceLocations returns all locations where the given object is referenced.
func (s *Server) findReferenceLocations(result *compileResult, obj types.Object) []Location {
	refIdents := result.refIdentsFor(obj)
	if len(refIdents) == 0 {
		return nil
	}
	locations := make([]Location, 0, len(refIdents))
	for _, refIdent := range refIdents {
		locations = append(locations, s.createLocationFromIdent(result.fset, refIdent))
	}
	return locations
}

// handleMethodReferences finds all references to a method, including interface
// implementations and interface method references.
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

// findEmbeddedInterfaceReferences finds references to methods in interfaces
// that embed the given interface.
func (s *Server) findEmbeddedInterfaceReferences(result *compileResult, iface *types.Interface, methodName string) []Location {
	var locations []Location
	seenIfaces := make(map[*types.Interface]bool)

	var find func(*types.Interface)
	find = func(current *types.Interface) {
		if seenIfaces[current] {
			return
		}
		seenIfaces[current] = true

		for spec := range result.mainASTPkgSpecToGenDecl {
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

			for i := range embedIface.NumEmbeddeds() {
				if types.Identical(embedIface.EmbeddedType(i), current) {
					method, index, _ := types.LookupFieldOrMethod(embedIface, false, typeName.Pkg(), methodName)
					if method != nil && index != nil {
						locations = append(locations, s.findReferenceLocations(result, method)...)
					}
					find(embedIface)
				}
			}
		}
	}
	find(iface)
	return locations
}

// findImplementingMethodReferences finds references to all methods that
// implement the given interface method.
func (s *Server) findImplementingMethodReferences(result *compileResult, iface *types.Interface, methodName string) []Location {
	var locations []Location
	for spec := range result.mainASTPkgSpecToGenDecl {
		typeSpec, ok := spec.(*gopast.TypeSpec)
		if !ok {
			continue
		}
		typeName := result.typeInfo.ObjectOf(typeSpec.Name)
		if typeName == nil {
			continue
		}
		named, ok := typeName.Type().(*types.Named)
		if !ok || !types.Implements(named, iface) {
			continue
		}

		method, index, _ := types.LookupFieldOrMethod(named, false, named.Obj().Pkg(), methodName)
		if method == nil || index == nil {
			continue
		}
		locations = append(locations, s.findReferenceLocations(result, method)...)
	}
	return locations
}

// findInterfaceMethodReferences finds references to interface methods that this
// method implements, including methods from embedded interfaces.
func (s *Server) findInterfaceMethodReferences(result *compileResult, fn *types.Func) []Location {
	var locations []Location
	recvType := fn.Type().(*types.Signature).Recv().Type()
	seenIfaces := make(map[*types.Interface]bool)

	for spec := range result.mainASTPkgSpecToGenDecl {
		typeSpec, ok := spec.(*gopast.TypeSpec)
		if !ok {
			continue
		}
		typeName := result.typeInfo.ObjectOf(typeSpec.Name)
		if typeName == nil {
			continue
		}
		ifaceType, ok := typeName.Type().Underlying().(*types.Interface)
		if !ok || !types.Implements(recvType, ifaceType) || seenIfaces[ifaceType] {
			continue
		}
		seenIfaces[ifaceType] = true

		method, index, _ := types.LookupFieldOrMethod(ifaceType, false, typeName.Pkg(), fn.Name())
		if method == nil || index == nil {
			continue
		}
		locations = append(locations, s.findReferenceLocations(result, method)...)
		locations = append(locations, s.findEmbeddedInterfaceReferences(result, ifaceType, fn.Name())...)
	}
	return locations
}

// handleEmbeddedFieldReferences finds all references through embedded fields.
func (s *Server) handleEmbeddedFieldReferences(result *compileResult, obj types.Object) []Location {
	var locations []Location
	if fn, ok := obj.(*types.Func); ok {
		recv := fn.Type().(*types.Signature).Recv()
		if recv == nil {
			return nil
		}

		seenTypes := make(map[types.Type]bool)
		for spec := range result.mainASTPkgSpecToGenDecl {
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

			locations = append(locations, s.findEmbeddedMethodReferences(result, fn, named, recv.Type(), seenTypes)...)
		}
	}
	return locations
}

// findEmbeddedMethodReferences recursively finds all references to a method
// through embedded fields.
func (s *Server) findEmbeddedMethodReferences(result *compileResult, fn *types.Func, named *types.Named, targetType types.Type, seenTypes map[types.Type]bool) []Location {
	if seenTypes[named] {
		return nil
	}
	seenTypes[named] = true

	st, ok := named.Underlying().(*types.Struct)
	if !ok {
		return nil
	}

	var locations []Location
	hasEmbed := false
	for i := range st.NumFields() {
		field := st.Field(i)
		if !field.Embedded() {
			continue
		}

		if types.Identical(field.Type(), targetType) {
			hasEmbed = true

			method, _, _ := types.LookupFieldOrMethod(named, false, fn.Pkg(), fn.Name())
			if method != nil {
				locations = append(locations, s.findReferenceLocations(result, method)...)
			}
		}

		if fieldNamed, ok := field.Type().(*types.Named); ok {
			locations = append(locations, s.findEmbeddedMethodReferences(result, fn, fieldNamed, targetType, seenTypes)...)
		}
	}
	if hasEmbed {
		for spec := range result.mainASTPkgSpecToGenDecl {
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

			locations = append(locations, s.findEmbeddedMethodReferences(result, fn, named, named, seenTypes)...)
		}
	}
	return locations
}
