import type * as lsp from 'vscode-languageserver-protocol'
import type { Input, InputSlotKind, Property, ResourceIdentifier, InputSlotAccept } from '../../../xgo-code-editor'

export namespace xgoRenameResources {
  export const command = 'xgo.renameResources'
  export type Arguments = Array<{
    resource: ResourceIdentifier
    newName: string
  }>
  export type Result = lsp.WorkspaceEdit | null
}

export namespace xgoGetInputSlots {
  export const command = 'xgo.getInputSlots'
  type XGoGetInputSlotsParams = {
    textDocument: lsp.TextDocumentIdentifier
  }
  export type Arguments = [XGoGetInputSlotsParams]
  export type XGoInputSlot = {
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
  export type Result = XGoInputSlot[] | null
}

export namespace xgoGetProperties {
  export const command = 'xgo.getProperties'
  type XGoGetPropertiesParams = {
    /** The target name, `Game` for stage or a specific sprite name. */
    target: string
  }
  export type Arguments = [XGoGetPropertiesParams]
  export type Result = Property[]
}
