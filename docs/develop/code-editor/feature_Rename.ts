declare function invokeSymbolRenameForm(position: TextDocumentPosition): Promise<string>
declare function invokeResourceRenameForm(resource: ResourceIdentifier): Promise<string>

// This command will be specified in the response of the `textDocument/codeAction` request.
ui.registerCommand<[TextDocumentPosition], void>(builtInCommandRename, {
  icon: 'rename',
  title: 'Rename',
  handler: async (textDocumentPosition) => {

    const resourceReference = await getResourceReference(textDocumentPosition)
    if (resourceReference != null) {
      // Rename a resource-reference
      const resource = resourceReference.resource
      const newName = await invokeResourceRenameForm(resource)
      await renameResourceModel(project, resource, newName)
      const codeEdit: WorkspaceEdit = await lsp.request('workspace/executeCommand', {
        command: 'spx.renameResources',
        arguments: [{ resource, newName }]
      })
      await applyWorkspaceEdit(project, codeEdit)
      return
    }

    // Rename a non-resource-reference symbol
    const newName = await invokeSymbolRenameForm(textDocumentPosition)
    const codeEdit: WorkspaceEdit = await lsp.request('textDocument/rename', {
      ...textDocumentPosition,
      newName
    })
    await applyWorkspaceEdit(project, codeEdit)
  }
})
