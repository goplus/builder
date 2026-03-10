# Code Editor Generalization
Related issues: [goplus/builder#2803](https://github.com/goplus/builder/issues/2803)

## Background

XBuilder's code editor was originally written entirely against the spx domain model — `SpxProject`, `Stage`, `Sprite`, etc. To support other XGo class frameworks (e.g., `yap`) without duplicating the editor infrastructure, the code editor was split into two layers:

- **`xgo-code-editor`** — generic layer with no spx dependency
- **`spx-code-editor`** — spx-specific layer that extends the generic layer

The entry points are:

```
src/components/editor/code-editor/
  xgo-code-editor/    ← generic layer
  spx-code-editor/    ← spx-specific layer
```

Consumers use `spx-code-editor` today. A future yap editor would create a `yap-code-editor` sibling that reuses `xgo-code-editor` and supplies yap-specific implementations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       spx-code-editor                           │
│                                                                 │
│  SpxCodeEditorProject  SpxLSPClient  SpxXxxProvider  ...        │
│              │               │             │                    │
│              └───────────────┴─────────────┴──────────────────► │
│                                                  CodeEditor     │
│  ┌──────────────────────────────────── xgo-code-editor ───────┐ │
│  │  IXGoProject  ILSPClient  IXxxProvider  DocumentBase  ...  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Abstractions in `xgo-code-editor`

### `ClassFramework`

Declared in [`project.ts`](../../spx-gui/src/components/editor/code-editor/xgo-code-editor/project.ts), this describes the class framework in use for a project. It maps directly to `modfile.Project` in the XGo module system.

```ts
export interface ClassFramework {
  projectClass: { ext: string; className: string }
  workClasses: Array<{ ext: string; className: string; prefix?: string; embedded?: boolean }>
  pkgPaths: string[]
  autoImports: Array<{ name?: string; path: string }>
}
```

### `IXGoProject`

The project abstraction consumed by `CodeEditor`. Any framework's project adapter must implement this interface.

```ts
export interface IXGoProject {
  classFramework: ClassFramework
  getCodeFiles(): string[]
  getCodeOwner(filePath: string): ICodeOwner | null
  exportFiles(): Files
}
```

### `ICodeOwner`

Represents an entity that owns a code file (e.g., a sprite or the stage). Text documents in the editor correspond 1-to-1 with code owners.

```ts
export interface ICodeOwner {
  id: string
  name: string | LocaleMessage
  displayName?: LocaleMessage
  thumbnailFile?: File | null
  getTextDocumentId(): TextDocumentIdentifier
  getCode(): string
  setCode(newCode: string, kind: CodeChangeKind): void
}
```

### `ILSPClient`

Generic LSP client interface extracted from the spx-specific implementation. Generic providers interact only with this interface, which exposes both standard LSP methods and a few higher-level helpers.

Declared in [`lsp/types.ts`](../../spx-gui/src/components/editor/code-editor/xgo-code-editor/lsp/types.ts).

### `DocumentBase`

A local store of definition documentation items (hover docs, API reference content, etc.) — sourced from static definitions rather than the language server. It is pre-populated with XGo built-in definitions and any additional framework/spx-specific definitions passed at construction time.

Declared in [`document-base/index.ts`](../../spx-gui/src/components/editor/code-editor/xgo-code-editor/document-base/index.ts).

### Providers

Each editor feature (`hover`, `completion`, `diagnostics`, `resource`, `inlay-hint`, `context-menu`, `input-helper`, `api-reference`, `snippet-variables`) is expressed as a provider interface. Default generic implementations live as flat files directly in `xgo-code-editor/` (e.g., `hover.ts`, `completion.ts`, `diagnostics.ts`). Framework-specific code can override any provider (or all of them) via `CodeEditorParams`.

### `CodeEditor`

The central class declared in [`code-editor.ts`](../../spx-gui/src/components/editor/code-editor/xgo-code-editor/code-editor.ts). It is constructed with `CodeEditorParams` and owns a `TextDocument` per code file. All editor operations (format, rename, diagnostics, apply edits, …) go through `CodeEditor`.

```ts
export type CodeEditorParams = {
  project: IXGoProject
  history: History
  monaco: Monaco
  lspClient: ILSPClient
  apiReferenceProvider: IAPIReferenceProvider  // required
  documentBase?: IDocumentBase
  completionProvider?: ICompletionProvider
  diagnosticsProvider?: IDiagnosticsProvider
  snippetVariablesProvider?: ISnippetVariablesProvider
  hoverProvider?: IHoverProvider
  contextMenuProvider?: IContextMenuProvider
  resourceProvider?: IResourceProvider
  inputHelperProvider?: IInputHelperProvider
  inlayHintProvider?: IInlayHintProvider
}
```

Required: `project`, `history`, `monaco`, `lspClient`, `apiReferenceProvider`.  
All other providers have generic defaults in `xgo-code-editor/`.

## spx-Specific Layer (`spx-code-editor`)

The spx layer re-exports everything from `xgo-code-editor` and adds/overrides spx-specific parts.

### `SpxCodeEditorProject`

Adapts `SpxProject` to `IXGoProject`. Declares the `spxClassFramework` constant and maps stage/sprites to code owners.

File: [`spx-project.ts`](../../spx-gui/src/components/editor/code-editor/spx-code-editor/spx-project.ts)

### `SpxLSPClient`

Implements `ILSPClient` on top of the spxls Web Worker. Handles file sync, request tracing, and spx-specific custom commands.

File: [`lsp/spx-lsp-client.ts`](../../spx-gui/src/components/editor/code-editor/spx-code-editor/lsp/spx-lsp-client.ts)

### spx Providers

| Provider | File |
|---|---|
| `SpxAPIReferenceProvider` | `api-reference/index.ts` |
| `SpxDiagnosticsProvider` | `diagnostics.ts` |
| `SpxResourceProvider` | `resource.ts` |
| `SpxInputHelperProvider` | `input-helper.ts` |
| `SpxSnippetVariablesProvider` | `snippet-variables.ts` |

These override the generic defaults, typically wrapping `SpxLSPClient` for resource resolution or adding spx domain knowledge (e.g., runtime-driven diagnostics overlay).

### `useProvideCodeEditorCtx`

The Vue composition function that wires everything together and injects the `CodeEditor` instance into the app context.

File: [`context.ts`](../../spx-gui/src/components/editor/code-editor/spx-code-editor/context.ts)

```ts
export function useProvideCodeEditorCtx(editorStateRet: QueryRet<SpxEditorState>): QueryRet<CodeEditor> {
  // Creates Monaco, SpxLSPClient, DocumentBase, all spx providers, and CodeEditor,
  // then calls useProvideCodeEditor() to inject into app context.
}
```

Downstream components call `useCodeEditorRef()` (or `useCodeEditor()`) to access the editor instance.

## Adding a New Framework (e.g., `yap`)

1. Create `src/components/editor/code-editor/yap-code-editor/` with:
   - `yap-project.ts` — `YapCodeEditorProject implements IXGoProject` + `yapClassFramework: ClassFramework`
   - `lsp/yap-lsp-client.ts` — `YapLSPClient implements ILSPClient`
   - provider files (e.g., `diagnostics.ts`, `resource.ts`) — override only the providers that need framework-specific behaviour
   - `context.ts` — `useProvideCodeEditorCtx` that creates and injects a `CodeEditor` with the above
   - `index.ts` — re-export from `../xgo-code-editor` plus yap-specific additions

2. No changes to `xgo-code-editor` should be needed unless a new generic abstraction is required.