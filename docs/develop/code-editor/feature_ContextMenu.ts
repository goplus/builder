ui.registerContextMenuProvider({

  async provideContextMenu(ctx, position) {
    const textDocumentRange: TextDocumentRange = {
      textDocument: ctx.textDocument.id,
      range: { start: position, end: position }
    }
    const actions = await lsp.request('textDocument/codeAction', textDocumentRange)
    return actions.map(action => ({ action }))
  },

  async provideSelectionContextMenu(ctx, selection) {
    const textDocumentRange: TextDocumentRange = {
      textDocument: ctx.textDocument.id,
      range: selection
    }
    const items: MenuItem[] = []
    const lspActions = await lsp.request('textDocument/codeAction', textDocumentRange)
    items.push(...lspActions.map(action => ({ action })))
    items.push({
      action: {
        title: 'Explain',
        command: builtInCommandCopilotChat,
        arguments: [
          {
            kind: ChatTopicKind.Explain,
            target: {
              kind: ChatExplainKind.CodeSegment,
              codeSegment: { range: selection, content: ctx.textDocument.getValueInRange(selection) }
            }
          } satisfies ChatTopicExplain
        ]
      }
    })
    items.push({
      action: {
        title: 'Review',
        command: builtInCommandCopilotChat,
        arguments: [
          {
            kind: ChatTopicKind.Review,
            codeRange: selection
          } satisfies ChatTopicReview
        ]
      }
    })
    return items
  }
})
