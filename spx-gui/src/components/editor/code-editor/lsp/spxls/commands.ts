import type * as lsp from 'vscode-languageserver-protocol'
import type { DefinitionIdentifier, ResourceIdentifier } from '../../common'

export namespace spxGetDefinitions {
  export const command = 'spx.getDefinitions'
  export type Arguments = lsp.TextDocumentPositionParams[]
  export type Result = DefinitionIdentifier[] | null
}

export namespace spxRenameResources {
  export const command = 'spx.renameResources'
  export type Arguments = Array<{
    resource: ResourceIdentifier
    newName: string
  }>
  export type Result = lsp.WorkspaceEdit | null
}
