package pkgdata

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"fmt"
	"io"
)

//go:generate go run ./gen.go

//go:embed pkgdata.zip
var pkgdataZip []byte

// OpenExport opens a package export file.
func OpenExport(pkgPath string) (io.ReadCloser, error) {
	zr, err := zip.NewReader(bytes.NewReader(pkgdataZip), int64(len(pkgdataZip)))
	if err != nil {
		return nil, fmt.Errorf("create zip reader: %w", err)
	}
	exportFile := pkgPath + ".export"
	for _, f := range zr.File {
		if f.Name == exportFile {
			return f.Open()
		}
	}
	return nil, fmt.Errorf("package %q not found", pkgPath)
}
