/**
 * @desc Generic LSP client interface for XGo Code Editor.
 * No spx-specific knowledge should be imported here.
 */

import type * as lsp from 'vscode-languageserver-protocol'
import type { Disposer } from '@/utils/disposable'
import type { TextDocumentIdentifier, Position, ResourceReference, InputSlot, Property } from '../common'
import type { DefinitionIdentifier } from '../definition-id'

export type RequestContext = {
  /** Optional signal to cancel the request */
  signal?: AbortSignal
  /** Optional tracing metadata for the request. */
  traceOptions?: { command?: string }
}

export type { DefinitionIdentifier }

export type PropertyRenamedEvent = {
  /** The target that owns the property. */
  target: string
  /** The original name of the property before renaming */
  oldName: string
  /** The new name of the property after renaming */
  newName: string
}

export type LSPClientEvents = {
  propertyRenamed: PropertyRenamedEvent
}

/** Language-server operations consumed by the framework-independent editor providers. */
export interface ILSPClient {
  dispose(): void

  // -- Standard LSP methods --
  textDocumentHover(ctx: RequestContext, params: lsp.HoverParams): Promise<lsp.Hover | null>
  textDocumentDefinition(ctx: RequestContext, params: lsp.DefinitionParams): Promise<lsp.Definition | null>
  textDocumentTypeDefinition(ctx: RequestContext, params: lsp.TypeDefinitionParams): Promise<lsp.Definition | null>
  textDocumentPrepareRename(
    ctx: RequestContext,
    params: lsp.PrepareRenameParams
  ): Promise<lsp.PrepareRenameResult | null>
  textDocumentRename(ctx: RequestContext, params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null>
  textDocumentFormatting(ctx: RequestContext, params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null>
  textDocumentInlayHint(ctx: RequestContext, params: lsp.InlayHintParams): Promise<lsp.InlayHint[] | null>
  textDocumentDocumentLink(ctx: RequestContext, params: lsp.DocumentLinkParams): Promise<lsp.DocumentLink[] | null>
  textDocumentCompletion(
    ctx: RequestContext,
    params: lsp.CompletionParams
  ): Promise<lsp.CompletionList | lsp.CompletionItem[] | null>
  workspaceDiagnostic(
    ctx: RequestContext,
    params: lsp.WorkspaceDiagnosticParams
  ): Promise<lsp.WorkspaceDiagnosticReport>
  workspaceExecuteCommandXGoRenameResources(
    ctx: RequestContext,
    ...params: Array<{ resource: { uri: string }; newName: string }>
  ): Promise<lsp.WorkspaceEdit | null>

  // -- Higher-level methods (wrapping document link + custom commands) --
  getDefinition(
    ctx: RequestContext,
    textDocument: TextDocumentIdentifier,
    position: Position
  ): Promise<DefinitionIdentifier | null>
  getResourceReferences(ctx: RequestContext, textDocument: TextDocumentIdentifier): Promise<ResourceReference[]>
  getCompletionList(ctx: RequestContext, params: lsp.CompletionParams): Promise<lsp.CompletionList>
  getInputSlots(ctx: RequestContext, textDocument: TextDocumentIdentifier): Promise<InputSlot[]>
  getProperties(ctx: RequestContext, target: string): Promise<Property[]>
  onPropertyRenamed(handler: (event: PropertyRenamedEvent) => void): Disposer
}
