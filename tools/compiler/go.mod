module compiler

go 1.22.4

require (
	github.com/goplus/gogen v1.15.2
	github.com/goplus/gop v1.2.6
	github.com/goplus/igop v0.26.0
	github.com/goplus/mod v0.13.12
	github.com/qiniu/x v1.13.10
)

require (
	github.com/gopherjs/gopherjs v0.0.0-20200217142428-fce0ec30dd00 // indirect
	github.com/goplus/reflectx v1.2.2 // indirect
	github.com/timandy/routine v1.1.1 // indirect
	github.com/visualfc/funcval v0.1.4 // indirect
	github.com/visualfc/gid v0.1.0 // indirect
	github.com/visualfc/goembed v0.3.2 // indirect
	github.com/visualfc/xtype v0.2.0 // indirect
	golang.org/x/mod v0.19.0 // indirect
	golang.org/x/sync v0.8.0 // indirect
	golang.org/x/tools v0.21.1-0.20240508182429-e35e4ccd0d2d // indirect
)

replace (
	github.com/goplus/igop v0.25.0 => ../tiny-igop
	github.com/goplus/mod v0.13.12 => github.com/nighca/mod v0.0.0-20240805065729-b50535825ae2
)
