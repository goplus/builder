module github.com/goplus/builder/tools/spxls

go 1.26.0

tool github.com/goplus/xgolsw/cmd/pkgdatagen

require (
	github.com/goplus/builder/tools/ai v0.0.0
	github.com/goplus/xgolsw v0.22.2-0.20261008151630-3afeb3b412c4
)

require (
	github.com/goplus/gogen v1.24.7 // indirect
	github.com/goplus/mod v0.22.1 // indirect
	github.com/goplus/spbase v0.1.1 // indirect
	github.com/goplus/spx/v4 v4.0.0 // indirect
	github.com/goplus/xgo v1.7.6-0.20260925200949-51a44c58fd65 // indirect
	github.com/qiniu/x v1.18.3 // indirect
	github.com/visualfc/gid v0.3.6 // indirect
	golang.org/x/image v0.23.0 // indirect
	golang.org/x/mod v0.42.0 // indirect
	golang.org/x/sync v0.24.0 // indirect
	golang.org/x/tools v0.52.0 // indirect
)

replace github.com/goplus/builder/tools/ai => ../ai

// Temporary until https://github.com/goplus/xgolsw/pull/410 is merged.
replace github.com/goplus/xgolsw => github.com/nighca/goxlsw v0.0.0-20261028013455-85b6e75d95a1
