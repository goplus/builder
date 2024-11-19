async function getAPIsForPosition({ textDocument, position }: TextDocumentPosition): Promise<DefinitionIdentifier[]> {
  const definitions: DefinitionIdentifier[] = await lsp.request('workspace/executeCommand', {
    command: 'spx.getDefinitions',
    arguments: [textDocument, position]
  })
  // And do some filtering here
  return definitions
}

ui.registerAPIReferenceProvider({
  async provideAPIReference(ctx, position) {
    const apiDefinitions = await getAPIsForPosition({ textDocument: ctx.textDocument.id, position })
    const apiReferenceItems = await Promise.all(apiDefinitions.map(def => documentBase.getDocumentaion(def)))
    return apiReferenceItems
  }
})
