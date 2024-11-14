# Tech design for [Code Editor](../../product/code-editor.md)

## Modules

### `CodeEditor`

The `CodeEditor` module is the main module for the code editor. It contains the following sub-modules:

- `CodeEditorUI`: The user interface for the code editor.
- `LSP`: The Language Server Protocol implementation.
- `Copilot`: The AI code completion engine.
- `Runtime`: The runtime environment for running the code.
- `DocumentBase`: Management for documentations.

### `CodeEditorUI`

See API design in [`CodeEditorUI`](./module_CodeEditorUI.ts).

### `LSP`

See API design in [`LSP`](./module_LSP.ts).

### `Copilot`

See API design in [`Copilot`](./module_Copilot.ts).

### `Runtime`

See API design in [`Runtime`](./module_Runtime.ts).

### `DocumentBase`

See API design in [`DocumentBase`](./module_DocumentBase.ts).

## Key features' implementation

### Hover

See details in [`Hover`](./feature_Hover.ts).

### Completion

See details in [`Completion`](./feature_Completion.ts).

### Resource Reference

See details in [`ResourceReference`](./feature_ResourceReference.ts).

### Context Menu

See details in [`ContextMenu`](./feature_ContextMenu.ts).

### Diagnostics

See details in [`Diagnostics`](./feature_Diagnostics.ts).

### API Reference

See details in [`APIReference`](./feature_APIReference.ts).

### Copilot

See details in [`Copilot`](./feature_Copilot.ts).

### Rename

See details in [`Rename`](./feature_Rename.ts).
