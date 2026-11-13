module github.com/goplus/builder/tools/xgoexec-bundle

go 1.25.0

require (
	github.com/goplus/builder/tools/tutorial v0.0.0
	github.com/goplus/builder/tools/xgoexec v0.0.0
	github.com/goplus/ixgo v1.1.3
	github.com/goplus/mod v0.21.1
)

require (
	github.com/goplus/gogen v1.23.5 // indirect
	github.com/goplus/reflectx v1.7.5 // indirect
	github.com/goplus/xgo v1.7.5 // indirect
	github.com/qiniu/x v1.18.0 // indirect
	github.com/timandy/routine v1.1.6 // indirect
	github.com/visualfc/funcval v0.1.5 // indirect
	github.com/visualfc/gid v0.3.2 // indirect
	github.com/visualfc/xtype v0.3.2 // indirect
	golang.org/x/mod v0.32.0 // indirect
	golang.org/x/tools v0.41.0 // indirect
)

tool github.com/goplus/ixgo/cmd/qexp

replace github.com/goplus/builder/tools/tutorial => ../tutorial

replace github.com/goplus/builder/tools/xgoexec => ../xgoexec
