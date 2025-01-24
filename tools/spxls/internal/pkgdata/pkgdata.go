package pkgdata

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"strings"
	"sync"

	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
)

//go:generate go run ./gen/main.go

//go:embed pkgdata.zip
var pkgdataZip []byte

const (
	pkgExportSuffix = ".pkgexport"
	pkgDocSuffix    = ".pkgdoc"
)

// ListPkgs lists all packages in the pkgdata.zip file.
func ListPkgs() ([]string, error) {
	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to create zip reader: %w", err)
	}
	pkgs := make([]string, 0, len(zr.File)/2)
	for _, f := range zr.File {
		if strings.HasSuffix(f.Name, pkgExportSuffix) {
			pkgs = append(pkgs, strings.TrimSuffix(f.Name, pkgExportSuffix))
		}
	}
	return pkgs, nil
}

// OpenExport opens a package export file.
func OpenExport(pkgPath string) (io.ReadCloser, error) {
	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to create zip reader: %w", err)
	}
	pkgExportFile := pkgPath + pkgExportSuffix
	for _, f := range zr.File {
		if f.Name == pkgExportFile {
			return f.Open()
		}
	}
	return nil, fmt.Errorf("failed to find export file for package %q: %w", pkgPath, fs.ErrNotExist)
}

// pkgDocCache is a cache for package documentation.
var pkgDocCache sync.Map // map[string]*pkgdoc.PkgDoc

// GetPkgDoc gets the documentation for a package.
func GetPkgDoc(pkgPath string) (pkgDoc *pkgdoc.PkgDoc, err error) {
	if pkgDocIface, ok := pkgDocCache.Load(pkgPath); ok {
		return pkgDocIface.(*pkgdoc.PkgDoc), nil
	}
	defer func() {
		if err == nil {
			pkgDocCache.Store(pkgPath, pkgDoc)
		}
	}()

	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to create zip reader: %w", err)
	}
	pkgDocFile := pkgPath + pkgDocSuffix
	for _, f := range zr.File {
		if f.Name == pkgDocFile {
			rc, err := f.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open doc file for package %q: %w", pkgPath, err)
			}
			defer rc.Close()

			var pkgDoc pkgdoc.PkgDoc
			if err := json.NewDecoder(rc).Decode(&pkgDoc); err != nil {
				return nil, fmt.Errorf("failed to decode doc for package %q: %w", pkgPath, err)
			}
			return &pkgDoc, nil
		}
	}
	return nil, fmt.Errorf("failed to find doc file for package %q: %w", pkgPath, fs.ErrNotExist)
}
