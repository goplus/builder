package server

import (
	"bytes"
	"encoding/json"
)

// UnmarshalJSON unmarshals msg into the variable pointed to by params.
// In JSONRPC, optional messages may be "null", in which case it is a no-op.
func UnmarshalJSON(msg json.RawMessage, v any) error {
	if len(msg) == 0 || bytes.Equal(msg, []byte("null")) {
		return nil
	}
	return json.Unmarshal(msg, v)
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#documentUri
type DocumentURI string

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textDocumentIdentifier
type TextDocumentIdentifier struct {
	// The text document's uri.
	URI DocumentURI `json:"uri"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#workDoneProgressOptions
type WorkDoneProgressOptions struct {
	WorkDoneProgress bool `json:"workDoneProgress,omitempty"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#progressToken
type ProgressToken = any

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#workDoneProgressParams
type WorkDoneProgressParams struct {
	// An optional token that a server can use to report work done progress.
	WorkDoneToken ProgressToken `json:"workDoneToken,omitempty"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#position
type Position struct {
	// Line position in a document (zero-based).
	//
	// If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
	// If a line number is negative, it defaults to 0.
	Line uint32 `json:"line"`
	// Character offset on a line in a document (zero-based).
	//
	// The meaning of this offset is determined by the negotiated
	// `PositionEncodingKind`.
	//
	// If the character value is greater than the line length it defaults back to the
	// line length.
	Character uint32 `json:"character"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#range
type Range struct {
	// The range's start position.
	Start Position `json:"start"`
	// The range's end position.
	End Position `json:"end"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#textEdit
type TextEdit struct {
	// The range of the text document to be manipulated. To insert
	// text into a document create a range where start === end.
	Range Range `json:"range"`
	// The string to be inserted. For delete operations use an
	// empty string.
	NewText string `json:"newText"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#documentFormattingOptions
type DocumentFormattingOptions struct {
	WorkDoneProgressOptions
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#formattingOptions
type FormattingOptions struct {
	// Size of a tab in spaces.
	TabSize uint32 `json:"tabSize"`
	// Prefer spaces over tabs.
	InsertSpaces bool `json:"insertSpaces"`
	// Trim trailing whitespace on a line.
	//
	// @since 3.15.0
	TrimTrailingWhitespace bool `json:"trimTrailingWhitespace,omitempty"`
	// Insert a newline character at the end of the file if one does not exist.
	//
	// @since 3.15.0
	InsertFinalNewline bool `json:"insertFinalNewline,omitempty"`
	// Trim all newlines after the final newline at the end of the file.
	//
	// @since 3.15.0
	TrimFinalNewlines bool `json:"trimFinalNewlines,omitempty"`
}

// See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification#documentFormattingParams
type DocumentFormattingParams struct {
	// The document to format.
	TextDocument TextDocumentIdentifier `json:"textDocument"`
	// The format options.
	Options FormattingOptions `json:"options"`
	WorkDoneProgressParams
}
