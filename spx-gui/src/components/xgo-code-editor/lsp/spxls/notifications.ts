import type * as lsp from 'vscode-languageserver-protocol'
import { MessageDirection } from 'vscode-languageserver-protocol/lib/common/messages'

/**
 * The custom `textDocument/xgo.propertyRenamed` notification is sent from the server to the client
 * when a property (field or method) is renamed through the `textDocument/rename` request.
 */
export namespace xgoPropertyRenamedNotification {
  export const method = 'textDocument/xgo.propertyRenamed'
  export const messageDirection = MessageDirection.serverToClient
  export type Params = {
    /** The target name (e.g., "Game" for stage, sprite name for sprite) */
    target: string
    /** The original name of the property before renaming */
    oldName: string
    /** The new name of the property after renaming */
    newName: string
    /** The text document where the property is defined */
    textDocument: lsp.TextDocumentIdentifier
  }
}
