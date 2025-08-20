package embkb

import _ "embed"

// NOTE: For details about maintaining the embedded files below, see spx-gui/src/components/editor/code-editor/document-base/helpers.ts

//go:embed about_xgo.md
var aboutXGo string

// AboutXGo returns XGo language knowledge.
func AboutXGo() string {
	return aboutXGo
}

//go:embed xgo_syntax.md
var xgoSyntax string

// XGoSyntax returns XGo language syntax.
func XGoSyntax() string {
	return xgoSyntax
}

//go:embed about_spx.md
var aboutSpx string

// AboutSpx returns spx knowledge.
func AboutSpx() string {
	return aboutSpx
}

//go:embed spx_apis.md
var spxAPIs string

// SpxAPIs returns spx APIs.
func SpxAPIs() string {
	return spxAPIs
}

//go:embed about_xbuilder.md
var aboutXBuilder string

// AboutXBuilder returns XBuilder knowledge.
func AboutXBuilder() string {
	return aboutXBuilder
}
