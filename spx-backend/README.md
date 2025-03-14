# Server for Go+ Builder

## Prepare

* Set up [Go](https://go.dev/doc/install)
* Set up [Go+](https://github.com/goplus/gop/blob/main/doc/docs.md)

Then install deps:

```sh
go mod tidy
```

## Run server for development

Run

```sh
cp .env.dev .env
gop run ./cmd/spx-backend
```
