# spxls

## Upgrade

Steps to upgrade the `xgolsw` module:

```bash
go get github.com/goplus/xgolsw@latest
XGOLSW_DIR="$(GOOS=js GOARCH=wasm go list -f '{{.Dir}}' github.com/goplus/xgolsw)"
cp "${XGOLSW_DIR}/index.d.ts" ./
```
