package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/build"
	"go/parser"
	"go/token"
	"go/types"
	"os"
	"os/exec"
	"path"
	"path/filepath"

	"github.com/goplus/builder/tools/spxls/internal/pkgdoc"
	_ "github.com/goplus/spx"
	"golang.org/x/tools/go/gcexportdata"
)

// pkgPaths is the list of package paths to generate the exported symbols for.
//
// NOTE: All package paths listed here must also be imported in
// `github.com/goplus/builder/tools/ispx/embedded_pkgs.go`.
var pkgPaths = []string{
	"builtin",

	"archive/tar",
	"archive/zip",
	"bufio",
	"bytes",
	"cmp",
	"compress/bzip2",
	"compress/flate",
	"compress/gzip",
	"compress/lzw",
	"compress/zlib",
	"context",
	"crypto",
	"crypto/aes",
	"crypto/cipher",
	"crypto/des",
	"crypto/dsa",
	"crypto/ecdh",
	"crypto/ecdsa",
	"crypto/ed25519",
	"crypto/elliptic",
	"crypto/hmac",
	"crypto/md5",
	"crypto/rand",
	"crypto/rc4",
	"crypto/rsa",
	"crypto/sha1",
	"crypto/sha256",
	"crypto/sha512",
	"crypto/subtle",
	"encoding",
	"encoding/asn1",
	"encoding/base32",
	"encoding/base64",
	"encoding/binary",
	"encoding/csv",
	"encoding/gob",
	"encoding/hex",
	"encoding/json",
	"encoding/pem",
	"encoding/xml",
	"errors",
	"fmt",
	"hash",
	"hash/adler32",
	"hash/crc32",
	"hash/crc64",
	"hash/fnv",
	"hash/maphash",
	"html",
	"html/template",
	"image",
	"image/color",
	"image/color/palette",
	"image/draw",
	"image/gif",
	"image/jpeg",
	"image/png",
	"io",
	"io/fs",
	"io/ioutil",
	"log",
	"log/slog",
	"maps",
	"math",
	"math/big",
	"math/bits",
	"math/cmplx",
	"math/rand",
	"mime",
	"net/http",
	"net/netip",
	"net/url",
	"os",
	"path",
	"path/filepath",
	"reflect",
	"regexp",
	"regexp/syntax",
	"runtime",
	"slices",
	"sort",
	"strconv",
	"strings",
	"sync",
	"sync/atomic",
	"syscall/js",
	"text/scanner",
	"text/tabwriter",
	"text/template",
	"text/template/parse",
	"time",
	"time/tzdata",
	"unicode",
	"unicode/utf16",
	"unicode/utf8",

	"github.com/goplus/spx",
	"github.com/hajimehoshi/ebiten/v2",
}

// generate generates the pkgdata.zip file containing the exported symbols of
// the given packages.
func generate() error {
	var zipBuf bytes.Buffer
	zw := zip.NewWriter(&zipBuf)
	for _, pkgPath := range pkgPaths {
		buildPkg, err := build.Import(pkgPath, "", build.ImportComment)
		if err != nil {
			continue
		}

		var pkgDoc *pkgdoc.PkgDoc
		if pkgPath == "builtin" {
			astFile, err := parser.ParseFile(token.NewFileSet(), filepath.Join(buildPkg.Dir, "builtin.go"), nil, parser.ParseComments)
			if err != nil {
				return fmt.Errorf("failed to parse builtin.go: %w", err)
			}

			pkgDoc = &pkgdoc.PkgDoc{
				Path:   pkgPath,
				Name:   pkgPath,
				Vars:   make(map[string]string),
				Consts: make(map[string]string),
				Types:  make(map[string]*pkgdoc.TypeDoc),
				Funcs:  make(map[string]string),
			}
			for _, decl := range astFile.Decls {
				switch decl := decl.(type) {
				case *ast.GenDecl:
					switch decl.Tok {
					case token.VAR:
						for _, spec := range decl.Specs {
							switch spec := spec.(type) {
							case *ast.ValueSpec:
								for _, name := range spec.Names {
									doc := spec.Doc.Text()
									if doc == "" {
										doc = decl.Doc.Text()
									}
									pkgDoc.Vars[name.Name] = doc
								}
							default:
								return fmt.Errorf("unknown builtin gen decl spec: %T", spec)
							}
						}
					case token.CONST:
						for _, spec := range decl.Specs {
							switch spec := spec.(type) {
							case *ast.ValueSpec:
								for _, name := range spec.Names {
									doc := spec.Doc.Text()
									if doc == "" {
										doc = decl.Doc.Text()
									}
									pkgDoc.Consts[name.Name] = doc
								}
							default:
								return fmt.Errorf("unknown builtin gen decl spec: %T", spec)
							}
						}
					case token.IMPORT:
					case token.TYPE:
						for _, spec := range decl.Specs {
							switch spec := spec.(type) {
							case *ast.TypeSpec:
								doc := spec.Doc.Text()
								if doc == "" {
									doc = decl.Doc.Text()
								}
								pkgDoc.Types[spec.Name.Name] = &pkgdoc.TypeDoc{
									Doc: doc,
								}
							default:
								return fmt.Errorf("unknown builtin gen decl spec: %T", spec)
							}
						}
					default:
						return fmt.Errorf("unknown builtin gen decl token: %s", decl.Tok)
					}
				case *ast.FuncDecl:
					pkgDoc.Funcs[decl.Name.Name] = decl.Doc.Text()
				default:
					return fmt.Errorf("unknown builtin decl: %T", decl)
				}
			}
		} else {
			exportFile, err := execGo("list", "-trimpath", "-export", "-f", "{{.Export}}", pkgPath)
			if err != nil {
				return err
			}
			exportFile = bytes.TrimSpace(exportFile)
			if len(exportFile) == 0 {
				continue
			}

			f, err := os.Open(string(exportFile))
			if err != nil {
				return err
			}
			defer f.Close()

			r, err := gcexportdata.NewReader(f)
			if err != nil {
				return fmt.Errorf("failed to create package export reader: %w", err)
			}

			fset := token.NewFileSet()
			typesPkg, err := gcexportdata.Read(r, fset, make(map[string]*types.Package), pkgPath)
			if err != nil {
				return fmt.Errorf("failed to read package export data: %w", err)
			}
			if zf, err := zw.Create(pkgPath + ".pkgexport"); err != nil {
				return err
			} else if err := gcexportdata.Write(zf, fset, typesPkg); err != nil {
				return fmt.Errorf("failed to write optimized package export data: %w", err)
			}

			astPkgs, err := parser.ParseDir(token.NewFileSet(), buildPkg.Dir, nil, parser.ParseComments)
			if err != nil {
				return fmt.Errorf("failed to parse package: %w", err)
			}
			astPkg, ok := astPkgs[path.Base(buildPkg.ImportPath)]
			if !ok {
				continue
			}

			pkgDoc = pkgdoc.New(astPkg, pkgPath)
		}
		if zf, err := zw.Create(pkgPath + ".pkgdoc"); err != nil {
			return err
		} else if err := json.NewEncoder(zf).Encode(pkgDoc); err != nil {
			return fmt.Errorf("failed to encode package doc: %w", err)
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	return os.WriteFile("pkgdata.zip", zipBuf.Bytes(), 0o644)
}

// execGo executes the given go command.
func execGo(args ...string) ([]byte, error) {
	cmd := exec.Command("go", args...)
	cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
	output, err := cmd.Output()
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			err = fmt.Errorf("%w: %s", err, ee.Stderr)
		}
		return nil, fmt.Errorf("failed to execute go command: %w", err)
	}
	return output, nil
}

func main() {
	if err := generate(); err != nil {
		panic(err)
	}
}
