//go:build ignore

package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"go/token"
	"go/types"
	"os"
	"os/exec"
	"strings"

	"golang.org/x/tools/go/gcexportdata"
)

// pkgs is the list of packages to generate the exported symbols for.
var pkgs = []string{
	"archive/...",
	"bufio",
	"bytes",
	"cmp",
	"compress/...",
	"container/...",
	"context",
	"crypto/...",
	"database/...",
	"debug/...",
	"embed",
	"encoding/...",
	"errors",
	"expvar",
	"flag",
	"fmt",
	"go/...",
	"hash/...",
	"html/...",
	"image/...",
	"index/...",
	"io/...",
	"log/...",
	"maps",
	"math/...",
	"mime/...",
	"net/...",
	"os/...",
	"path/...",
	"plugin",
	"reflect/...",
	"regexp/...",
	"runtime/...",
	"slices",
	"sort",
	"strconv",
	"strings",
	"sync/...",
	"syscall/...",
	"testing/...",
	"text/...",
	"time/...",
	"unicode/...",

	"github.com/goplus/spx/...",
}

// generate generates the pkgdata.zip file containing the exported symbols of
// the given packages.
func generate() error {
	var zipBuf bytes.Buffer
	zw := zip.NewWriter(&zipBuf)
	for _, pkg := range pkgs {
		cmd := exec.Command("go", "list", "-f", "{{.ImportPath}}:{{.Export}}", "-export", pkg)
		cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
		output, err := cmd.Output()
		if err != nil {
			if ee, ok := err.(*exec.ExitError); ok {
				err = fmt.Errorf("%w: %s", err, ee.Stderr)
			}
			return fmt.Errorf("failed to go list: %w", err)
		}

		for _, line := range strings.Split(string(output), "\n") {
			if line == "" {
				continue
			}

			pkgPath, exportFile, ok := strings.Cut(line, ":")
			if !ok || exportFile == "" {
				continue
			}

			f, err := os.Open(exportFile)
			if err != nil {
				return err
			}
			defer f.Close()

			r, err := gcexportdata.NewReader(f)
			if err != nil {
				return fmt.Errorf("failed to create export reader: %w", err)
			}

			fset := token.NewFileSet()
			pkg, err := gcexportdata.Read(r, fset, make(map[string]*types.Package), pkgPath)
			if err != nil {
				return fmt.Errorf("failed to read export data: %w", err)
			}

			zf, err := zw.Create(pkgPath + ".export")
			if err != nil {
				return err
			}
			if err := gcexportdata.Write(zf, fset, pkg); err != nil {
				return fmt.Errorf("failed to write optimized export data: %w", err)
			}
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	return os.WriteFile("pkgdata.zip", zipBuf.Bytes(), 0644)
}

func main() {
	if err := generate(); err != nil {
		panic(err)
	}
}
