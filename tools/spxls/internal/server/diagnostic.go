package server

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocument_diagnostic
func (s *Server) textDocumentDiagnostic(params *DocumentDiagnosticParams) (*DocumentDiagnosticReport, error) {
	result, err := s.compile()
	if err != nil {
		return nil, err
	}

	return &DocumentDiagnosticReport{Value: &RelatedFullDocumentDiagnosticReport{
		FullDocumentDiagnosticReport: FullDocumentDiagnosticReport{
			Kind:  string(DiagnosticFull),
			Items: result.diagnostics[params.TextDocument.URI],
		},
	}}, nil
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#workspace_diagnostic
func (s *Server) workspaceDiagnostic(params *WorkspaceDiagnosticParams) (*WorkspaceDiagnosticReport, error) {
	result, err := s.compile()
	if err != nil {
		return nil, err
	}

	var items []WorkspaceDocumentDiagnosticReport
	for file, fileDiags := range result.diagnostics {
		items = append(items, Or_WorkspaceDocumentDiagnosticReport{
			Value: &WorkspaceFullDocumentDiagnosticReport{
				URI: DocumentURI(file),
				FullDocumentDiagnosticReport: FullDocumentDiagnosticReport{
					Kind:  string(DiagnosticFull),
					Items: fileDiags,
				},
			},
		})
	}
	return &WorkspaceDiagnosticReport{Items: items}, nil
}
