# spxls

## Upgrade

Steps to upgrade the `xgolsw` module:

```bash
go get github.com/goplus/xgolsw
go mod tidy
XGOLSW_DIR="$(GOOS=js GOARCH=wasm go list -f '{{.Dir}}' github.com/goplus/xgolsw)"
cp "${XGOLSW_DIR}/index.d.ts" ./
```

The frontend declaration is a symbolic link to `index.d.ts`. Keep it synchronized with the selected module version.

`build.sh` packages the spx SDK, its engine package, XBuilder's AI extension, and the Tutorial SDK. Standard and XGo builtin package data
are embedded in xgolsw. The frontend Worker supplies the additional archive and classfile registration to each language
server instance. Keep SPX registration aligned with `../ispx/main.go` and Tutorial registration aligned with
`../tutorial/gox.mod` when changing the SDKs or auto-imported packages.

Rebuild the WASM assets and run the Worker integration tests from `spx-gui`:

```bash
cd ../../spx-gui
./build-wasm.sh
pnpm exec vitest --run src/components/xgo-code-editor/lsp/worker.test.ts
```
