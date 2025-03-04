package server

import "go/types"

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_implementation
func (s *Server) textDocumentImplementation(params *ImplementationParams) (any, error) {
	result, _, astFile, err := s.compileAndGetASTFileForDocumentURI(params.TextDocument.URI)
	if err != nil {
		return nil, err
	}
	if astFile == nil {
		return nil, nil
	}
	position := result.toPosition(astFile, params.Position)

	obj := result.typeInfo.ObjectOf(result.identAtASTFilePosition(astFile, position))
	if !isMainPkgObject(obj) {
		return nil, nil
	}

	if method, ok := obj.(*types.Func); ok && method.Type().(*types.Signature).Recv() != nil {
		if recv := method.Type().(*types.Signature).Recv().Type(); types.IsInterface(recv) {
			locations := s.findImplementingMethodDefinitions(result, recv.(*types.Interface), method.Name())
			return deduplicateLocations(locations), nil
		}
	}

	return result.locationForPos(obj.Pos()), nil
}

// findImplementingMethodDefinitions finds the definition locations of all
// methods that implement the given interface method.
func (s *Server) findImplementingMethodDefinitions(result *compileResult, iface *types.Interface, methodName string) []Location {
	var implementations []Location
	for _, obj := range result.typeInfo.Defs {
		if obj == nil {
			continue
		}
		named, ok := obj.Type().(*types.Named)
		if !ok {
			continue
		}
		if !types.Implements(named, iface) {
			continue
		}

		for i := range named.NumMethods() {
			method := named.Method(i)
			if method.Name() != methodName {
				continue
			}

			implementations = append(implementations, result.locationForPos(method.Pos()))
		}
	}
	return implementations
}
