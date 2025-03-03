package server

import (
	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	gopast "github.com/goplus/gop/ast"
)

// SpxReferencePkg is a reference to an imported package.
type SpxReferencePkg struct {
	PkgPath string
	Pkg     *pkgdoc.PkgDoc
	Node    *gopast.ImportSpec
}
