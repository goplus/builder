# Server for XBuilder

## Prepare

* Set up [Go](https://go.dev/doc/install)
* Set up [XGo](https://github.com/goplus/xgo/blob/main/doc/docs.md)

Then install deps:

```sh
go mod tidy
```

## Generate CLAUDE.md Documentation

The project includes a tool to automatically generate `CLAUDE.md` documentation from system prompts. This ensures documentation stays in sync with the actual prompts used by the AI system.

### Install the generation tool

```sh
go install ./cmd/claudegen
```

### Generate documentation

```sh
cd internal/copilot/standard
go generate
```

This will create `CLAUDE.md` in the copilot directory, containing the system prompt without custom element documentation (suitable for external Claude usage).

## Run server for development

Run

```sh
cp .env.dev .env
xgo run ./cmd/spx-backend
```
