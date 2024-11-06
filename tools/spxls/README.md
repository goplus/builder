# spxls

A lightweight Go+ language server for [spx](https://github.com/goplus/spx) that runs in the browser using WebAssembly.

## LSP methods

| Category | Method | Purpose & Explanation |
|----------|--------|-----------------------|
| **Lifecycle Management** |||
|| [`initialize`](https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#initialize) | Performs initial handshake, establishes server capabilities and client configuration. |
|| [`initialized`](https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#initialized) | Marks completion of initialization process, enabling request processing. |
|| [`shutdown`](https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#shutdown) | *Protocol conformance only.* |
|| [`exit`](https://microsoft.github.io/language-server-protocol/specifications/base/0.9/specification/#exit) | *Protocol conformance only.* |
| **Document Synchronization** |||
|| [`textDocument/didOpen`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_didOpen) | Registers new document in server state and triggers initial diagnostics. |
|| [`textDocument/didChange`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_didChange) | Synchronizes document content changes between client and server. |
|| [`textDocument/didSave`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_didSave) | Processes document save events and triggers related operations. |
|| [`textDocument/didClose`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_didClose) | Removes document from server state and cleans up resources. |
| **Code Intelligence** |||
|| [`textDocument/hover`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_hover) | Shows types and documentation at cursor position. |
|| [`textDocument/completion`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_completion) | Generates context-aware code suggestions. |
|| [`completionItem/resolve`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#completionItem_resolve) | Provides detailed information for selected completion items. |
|| [`textDocument/signatureHelp`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_signatureHelp) | Shows function/method signature information. |
|| [`textDocument/inlayHint`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_inlayHint) | Provides inline hints (type information, parameter names). |
|| [`inlayHint/resolve`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#inlayHint_resolve) | Provides detailed information for selected inlay hints. |
| **Symbols & Navigation** |||
|| [`textDocument/definition`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_definition) | Locates symbol definitions across workspace. |
|| [`textDocument/declaration`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_declaration) | Finds symbol declarations. |
|| [`textDocument/typeDefinition`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_typeDefinition) | Navigates to type definitions of variables/fields. |
|| [`textDocument/implementation`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_implementation) | Locates implementations. |
|| [`textDocument/references`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_references) | Finds all references of a symbol. |
|| [`textDocument/documentSymbol`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_documentSymbol) | Provides document symbols for outline/navigation. |
|| [`textDocument/documentHighlight`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_documentHighlight) | Highlights other occurrences of selected symbol. |
|| [`workspace/symbol`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_symbol) | Provides workspace-wide symbol search with name matching patterns. |
|| [`workspaceSymbol/resolve`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_symbolResolve) | Provides detailed information for selected workspace symbols. |
| **Code Quality** |||
|| [`textDocument/publishDiagnostics`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_publishDiagnostics) | Reports code errors and warnings in real-time. |
|| [`textDocument/diagnostic`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_diagnostic) | Pulls diagnostics for documents on request (pull model). |
|| [`workspace/diagnostic`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_diagnostic) | Pulls diagnostics for all workspace documents on request. |
|| [`textDocument/codeAction`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_codeAction) | Suggests fixes for diagnostics and code improvements. |
| **Code Modification** |||
|| [`textDocument/formatting`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_formatting) | Applies standardized formatting rules to document. |
|| [`textDocument/rename`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_rename) | Performs consistent symbol renaming across workspace. |
| **Semantic Features** |||
|| [`textDocument/semanticTokens/full`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#semanticTokens_fullRequest) | Provides semantic coloring for whole document. |
| **Other** |||
|| [`workspace/executeCommand`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_executeCommand) | Executes [predefined commands](#predefined-commands) for workspace-specific operations. |

## Predefined commands

### Resource renaming

The `spx.renameResources` command enables renaming of resources referenced by string literals (e.g., `play "explosion"`)
across the workspace.

*Request:*

- method: [`workspace/executeCommand`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspace_executeCommand)
- params: [`ExecuteCommandParams`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#executeCommandParams)
defined as follows:

```typescript
interface ExecuteCommandParams {
    /**
     * The identifier of the actual command handler.
     */
    command: 'spx.renameResources'

    /**
     * Arguments that the command should be invoked with.
     */
    arguments: RenameResourceParams[]
}
```

```typescript
/**
 * Parameters to rename a resource in the workspace.
 */
interface RenameResourceParams {
    /**
     * The resource.
     */
    resource: ResourceIdentifier

    /**
     * The new name of the resource.
     */
    newName: string
}
```

```typescript
interface ResourceIdentifier {
    /**
     * The resource's URI.
     */
    uri: URI
}
```

*Response:*

- result: [`WorkspaceEdit`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspaceEdit)
| `null` describing the modification to the workspace. `null` should be treated the same as [`WorkspaceEdit`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#workspaceEdit)
with no changes (no change was required).
- error: code and message set in case when rename could not be performed for any reason.
