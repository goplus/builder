# spxls

## Upgrade

Steps to upgrade the `goxlsw` module:

```bash
go get github.com/goplus/goxlsw@latest
GOXLSW_DIR="$(GOOS=js GOARCH=wasm go list -f '{{.Dir}}' github.com/goplus/goxlsw)"
cp "${GOXLSW_DIR}/index.d.ts" "${GOXLSW_DIR}/client.ts" ./
```
