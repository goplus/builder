/**
 * @desc Generic LSP client interface for XGo Code Editor.
 * No spx-specific knowledge should be imported here.
 */

import type * as lsp from 'vscode-languageserver-protocol'
import type { TextDocumentIdentifier, Position, ResourceReference, InputSlot, DefinitionIdentifier } from '../common'

export type RequestContext = {
  /** Optional signal to cancel the request */
  signal?: AbortSignal
  /**
   * Optional tracing options for the request.
   * TODO: Consider moving this to spx layer instead of generic LSP client layer.
   */
  traceOptions?: { command?: string }
}

export type { DefinitionIdentifier }

/**
 * Generic LSP client interface — extracted from SpxLSPClient method signatures.
 * The base generic providers use this interface so they have no dependency on SpxLSPClient.
 */
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
  getCompletionItems(ctx: RequestContext, params: lsp.CompletionParams): Promise<lsp.CompletionItem[]>
  getInputSlots(ctx: RequestContext, textDocument: TextDocumentIdentifier): Promise<InputSlot[]>
}
