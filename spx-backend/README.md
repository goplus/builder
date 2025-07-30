# Server for XBuilder

## Prepare

* Set up [Go](https://go.dev/doc/install)
* Set up [XGo](https://github.com/goplus/xgo/blob/main/doc/docs.md)

Then install deps:

```sh
go mod tidy
```

## Run server for development

Run

```sh
cp .env.dev .env
xgo run ./cmd/spx-backend
```
