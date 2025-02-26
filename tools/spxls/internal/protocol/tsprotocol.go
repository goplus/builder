package protocol

const (
	// The diagnostic's severity.
	// Reports an error.
	SeverityError DiagnosticSeverity = 1
	// Reports a warning.
	SeverityWarning DiagnosticSeverity = 2
	// Reports an information.
	SeverityInformation DiagnosticSeverity = 3
	// Reports a hint.
	SeverityHint DiagnosticSeverity = 4
	// The diagnostic tags.
	//
	// @since 3.15.0
	// Unused or unnecessary code.
	//
	// Clients are allowed to render diagnostics with this tag faded out instead of having
	// an error squiggle.
	Unnecessary DiagnosticTag = 1
	// Deprecated or obsolete code.
	//
	// Clients are allowed to rendered diagnostics with this tag strike through.
	Deprecated DiagnosticTag = 2
	// The document diagnostic report kinds.
	//
	// @since 3.17.0
	// A diagnostic report with a full
	// set of problems.
	DiagnosticFull DocumentDiagnosticReportKind = "full"
	// A report indicating that the last
	// returned report is still accurate.
	DiagnosticUnchanged DocumentDiagnosticReportKind = "unchanged"
)

// A set of predefined code action kinds
type CodeActionKind string

// The diagnostic's severity.
type DiagnosticSeverity uint32

// The diagnostic tags.
//
// @since 3.15.0
type DiagnosticTag uint32

// created for Or [RelatedFullDocumentDiagnosticReport RelatedUnchangedDocumentDiagnosticReport]
type Or_DocumentDiagnosticReport struct {
	Value any `json:"value"`
}

// The result of a document diagnostic pull request. A report can
// either be a full report containing all diagnostics for the
// requested document or an unchanged report indicating that nothing
// has changed in terms of diagnostics in comparison to the last
// pull request.
//
// @since 3.17.0
//
// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification#documentDiagnosticReport
type DocumentDiagnosticReport = Or_DocumentDiagnosticReport // (alias)
// The document diagnostic report kinds.
//
// @since 3.17.0
type DocumentDiagnosticReportKind string
