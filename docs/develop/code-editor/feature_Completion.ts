ui.registerCompletionProvider({
  async provideCompletion(ctx, position) {
    const textDocumentPosition: TextDocumentPosition = { textDocument: ctx.textDocument.id, position }
    const completions = await lsp.request('textDocument/completion', textDocumentPosition)
    return completions
  }
})
