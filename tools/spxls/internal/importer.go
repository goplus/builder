package internal

import (
	"fmt"
	"go/types"
	"sync"

	"github.com/goplus/builder/tools/spxls/internal/pkgdata"
	goptoken "github.com/goplus/gop/token"
	"golang.org/x/tools/go/gcexportdata"
)

// importer implements [types.Importer].
type importer struct {
	mu     sync.Mutex
	fset   *goptoken.FileSet
	loaded map[string]*types.Package
}

// NewImporter returns a new [types.Importer] that reads package data from the
// embedded pkgdata.
func NewImporter(fset *goptoken.FileSet) types.Importer {
	if fset == nil {
		fset = goptoken.NewFileSet()
	}
	loaded := make(map[string]*types.Package)
	loaded["unsafe"] = types.Unsafe
	return &importer{
		fset:   fset,
		loaded: loaded,
	}
}

// Import implements [types.Importer].
func (imp *importer) Import(path string) (*types.Package, error) {
	imp.mu.Lock()
	defer imp.mu.Unlock()

	if pkg, ok := imp.loaded[path]; ok && pkg.Complete() {
		return pkg, nil
	}

	export, err := pkgdata.OpenExport(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open export file: %w", err)
	}
	defer export.Close()

	pkg, err := gcexportdata.Read(export, imp.fset, imp.loaded, path)
	if err != nil {
		return nil, fmt.Errorf("failed to parse export data: %w", err)
	}
	return pkg, nil
}
