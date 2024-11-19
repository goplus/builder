// Allow `CodeEditorUI` to format current document when "format" button clicked.
ui.registerFormattingEditProvider({
  async provideDocumentFormattingEdits(ctx) {
    const textDocument = ctx.textDocument.id
    const edits: TextEdit[] = await lsp.request('textDocument/formatting', textDocument)
    return edits
  }
})

// Format the whole project before we run it.
async function formatProject(project: Project) {
  const textDocuments = await getAllTextDocuments(project)
  const changes: { [uri: string]: TextEdit[] } = {}
  await Promise.all(textDocuments.map(async td => {
    const edits: TextEdit[] = await lsp.request('textDocument/formatting', td)
    changes[td.uri] = edits
  }))
  await applyWorkspaceEdit(project, { changes })
}

declare function getAllTextDocuments(project: Project): Promise<TextDocumentIdentifier[]>
