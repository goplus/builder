# spxls

Builds XBuilder's shared browser-side XGo language server from `github.com/goplus/xgolsw`.
The directory and artifact names are historical: the same WASM server serves SPX, Tutorial, and ordinary XGo
workspaces. Classfile registration is supplied per server instance by the caller.

The application-specific part is the package-data archive: it bundles the SPX SDK and engine, the AI extension,
and the Tutorial SDK. Standard language features for another class framework require its package data and classfile
registration. Framework-specific semantics may require an upstream adapter. The upstream server includes an SPX
semantic adapter, activated only when the workspace registers the SPX framework.

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
pnpm exec vitest --run src/components/xgo-code-editor/lsp/worker.test.ts \
  src/components/editor/spx-code-editor/lsp/worker.test.ts src/components/course-editor/lsp.test.ts
```
