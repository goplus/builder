async function getSymbolWithDefinitions(textDocument: TextDocumentIdentifier): Promise<SymbolWithDefinition[]> {
  const links: TODO[] = await lsp.request('textDocument/documentLink', textDocument)
  return links.filter(link => isApiDefinitionURI(link.target)).map(link => {
    const range: TextDocumentRange = {
      textDocument: textDocument,
      range: link.range as IRange
    }
    return {
      range,
      definition: link.data as DefinitionIdentifier
    }
  })
}

async function getSymbolWithDefinition({ textDocument, position }: TextDocumentPosition) {
  const apiDefinitions = await getSymbolWithDefinitions(textDocument)
  return apiDefinitions.find(def => contains(def.range.range, position))
}

ui.registerHoverProvider({
  async provideHover(ctx, position) {
    const textDocumentPosition: TextDocumentPosition = { textDocument: ctx.textDocument.id, position }
    const { content: lspContent, range } = await lsp.request('textDocument/hover', textDocumentPosition)
    const contents = [lspContent] // TODO: signatureHelp?
    const lspCodeActions = await lsp.request('textDocument/codeAction', textDocumentPosition)
    const actions = [...lspCodeActions]
    const resourceReference = await getResourceReference(textDocumentPosition)
    const symbolWithDefinition = await getSymbolWithDefinition(textDocumentPosition)
    if (resourceReference != null) {
      actions.push({
        title: 'Modify reference',
        command: builtInCommandResourceReferenceModify,
        arguments: [resourceReference.range, resourceReference.resource]
      })
    } else if (symbolWithDefinition != null) {
      actions.push({
        title: 'Explain',
        command: builtInCommandCopilotChat,
        arguments: [
          {
            kind: ChatTopicKind.Explain,
            target: {
              kind: ChatExplainKind.SymbolWithDefinition,
              ...symbolWithDefinition
            }
          } satisfies ChatTopicExplain
        ]
      })
    }
    return { contents, actions }
  }
})
