package pkgdata

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"

	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
)

//go:generate go run ./gen/main.go

//go:embed pkgdata.zip
var pkgdataZip []byte

// OpenExport opens a package export file.
func OpenExport(pkgPath string) (io.ReadCloser, error) {
	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to create zip reader: %w", err)
	}
	pkgExportFile := pkgPath + ".pkgexport"
	for _, f := range zr.File {
		if f.Name == pkgExportFile {
			return f.Open()
		}
	}
	return nil, fmt.Errorf("failed to find export file for package %q: %w", pkgPath, fs.ErrNotExist)
}

// GetPkgDoc gets the documentation for a package.
func GetPkgDoc(pkgPath string) (*pkgdoc.PkgDoc, error) {
	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to create zip reader: %w", err)
	}
	pkgDocFile := pkgPath + ".pkgdoc"
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
