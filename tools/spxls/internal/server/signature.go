package server

import (
	"errors"
	"go/types"
	"strings"
)

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_signatureHelp
func (s *Server) textDocumentSignatureHelp(params *SignatureHelpParams) (*SignatureHelp, error) {
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

	_, obj := result.identAndObjectAtASTFilePosition(astFile, params.Position)
	if obj == nil {
		return nil, nil
	}
	fun, ok := obj.(*types.Func)
	if !ok {
		return nil, nil
	}
	sig, ok := fun.Type().(*types.Signature)
	if !ok {
		return nil, nil
	}

	var paramsInfo []ParameterInformation
	for i := range sig.Params().Len() {
		param := sig.Params().At(i)
		paramsInfo = append(paramsInfo, ParameterInformation{
			Label: param.Name() + " " + getSimplifiedTypeString(param.Type()),
			// TODO: Add documentation.
		})
	}

	label := fun.Name() + "("
	if sig.Params().Len() > 0 {
		var paramLabels []string
		for _, p := range paramsInfo {
			paramLabels = append(paramLabels, p.Label)
		}
		label += strings.Join(paramLabels, ", ")
	}
	label += ")"

	if results := sig.Results(); results != nil && results.Len() > 0 {
		var returnTypes []string
		for i := range results.Len() {
			returnTypes = append(returnTypes, getSimplifiedTypeString(results.At(i).Type()))
		}
		label += " (" + strings.Join(returnTypes, ", ") + ")"
	}

	return &SignatureHelp{
		Signatures: []SignatureInformation{{
			Label: label,
			// TODO: Add documentation.
			Parameters: paramsInfo,
		}},
	}, nil
}
