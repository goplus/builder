function getAPIsForPosition({ textDocument, position }: TextDocumentPosition): Promise<DefinitionIdentifier[]> {
  return TODO
}

ui.registerAPIReferenceProvider({
  async provideAPIReference(ctx, position) {
    const apiDefinitions = await getAPIsForPosition({ textDocument: ctx.textDocument.id, position })
    const apiReferenceItems = await Promise.all(apiDefinitions.map(def => documentBase.getDocumentaion(def)))
    return apiReferenceItems
  }
})
