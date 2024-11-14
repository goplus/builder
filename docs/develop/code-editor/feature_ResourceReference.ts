async function getResourceReferences(textDocument: TextDocumentIdentifier): Promise<ResourceReference[]> {
  const links: TODO[] = await lsp.request('textDocument/documentLink', textDocument)
  return links.filter(link => isResourceURI(link.target)).map(link => ({
    range: link.range,
    resource: { uri: link.target }
  }))
}

async function getResourceReference({ textDocument, position }: TextDocumentPosition) {
  const resourceReferences = await getResourceReferences(textDocument)
  return resourceReferences.find(ref => contains(ref.range, position))
}

class ResourceReferencesProviderImpl extends EmitterImpl<{
  didChangeResourceReferences: []
}> implements ResourceReferencesProvider {

  constructor() {
    super()

    watch(project, () => this.emit('didChangeResourceReferences'))
  }

  async provideResourceReferences(ctx: ResourceReferencesContext) {
    return getResourceReferences(ctx.textDocument.id)
  }
}

ui.registerResourceReferencesProvider(new ResourceReferencesProviderImpl())
