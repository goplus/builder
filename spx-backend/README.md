# Server for Go+ Builder

## Prepare

* Set up [Go](https://go.dev/doc/install)
* Set up [Go+](https://github.com/goplus/gop/blob/main/doc/docs.md)

Then install deps:

```sh
go mod tidy
```

## Run server for development

Prepare config file (`.env`) for development, and then run

```sh
gop run ./cmd/spx-backend
```
