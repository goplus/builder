import type * as lsp from 'vscode-languageserver-protocol'
import type { DefinitionIdentifier, Input, InputSlotAccept, InputSlotKind, ResourceIdentifier } from '../../common'

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

export namespace spxGetInputSlots {
  export const command = 'spx.getInputSlots'
  type SpxGetInputSlotsParams = {
    textDocument: lsp.TextDocumentIdentifier
  }
  export type Arguments = [SpxGetInputSlotsParams]
  type SpxInputSlot = {
    /** Kind of the slot */
    kind: InputSlotKind
    /** Info describing what inputs are accepted by the slot */
    accept: InputSlotAccept
    /** Current input in the slot */
    input: Input
    /** Names for available user-predefined identifiers */
    predefinedNames: string[]
    /** Range in code for the slot */
    range: lsp.Range
  }
  export type Result = SpxInputSlot[] | null
}
