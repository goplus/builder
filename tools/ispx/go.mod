module github.com/goplus/builder/tools/ispx

go 1.26.0

tool github.com/goplus/ixgo/cmd/qexp

require (
	github.com/goplus/builder/tools/ai v0.0.0
	github.com/goplus/ixgo v1.2.4-0.20261016070941-725937421f76
	github.com/goplus/mod v0.22.0
	github.com/goplus/spx/v3 v3.3.0
)

require (
	github.com/goplus/gogen v1.24.7 // indirect
	github.com/goplus/reflectx v1.8.3 // indirect
	github.com/goplus/spbase v0.1.1 // indirect
	github.com/goplus/xgo v1.7.6-0.20260925200949-51a44c58fd65 // indirect
	github.com/qiniu/x v1.18.3 // indirect
	github.com/visualfc/funcval v0.1.5 // indirect
	github.com/visualfc/gid v0.3.6 // indirect
	github.com/visualfc/xtype v0.3.3 // indirect
	golang.org/x/image v0.23.0 // indirect
	golang.org/x/mobile v0.0.0-20220518205345-8578da9835fd // indirect
	golang.org/x/mod v0.40.0 // indirect
	golang.org/x/tools v0.49.0 // indirect
)

replace github.com/goplus/builder/tools/ai => ../ai

// Keep the existing compiler versions: the newer combination indents //line
// directives, which breaks source location mapping.
replace github.com/goplus/gogen => github.com/goplus/gogen v1.23.6-0.20260816085451-b240c8b2c5b1

replace github.com/goplus/xgo => github.com/goplus/xgo v1.7.6-0.20260818050008-fd36b6192e30
