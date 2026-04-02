import * as lsp from 'vscode-languageserver-protocol'
import { Disposable } from '@/utils/disposable'
import type { IXGoProject } from './project'
import { type IDocumentBase, DocumentBase } from './document-base'
import type { ILSPClient } from './lsp/types'
import {
  type ICodeEditorUIController,
  type IDiagnosticsProvider,
  type IResourceProvider,
  type IInputHelperProvider,
  type IContextMenuProvider,
  type IHoverProvider,
  type ICompletionProvider,
  type IAPIReferenceProvider,
  type IInlayHintProvider,
  type ISnippetVariablesProvider
} from './ui/code-editor-ui'
import {
  toLSPPosition,
  type TextDocumentIdentifier,
  type ResourceIdentifier,
  fromLSPTextEdit,
  type Position,
  getTextDocumentId,
  getCodeFilePath,
  type WorkspaceDiagnostics,
  type TextDocumentDiagnostics,
  fromLSPDiagnostic,
  type Property
} from './common'
import { filterPropertiesByDocumentation } from './utils'
import { TextDocument } from './text-document'
import { type Monaco } from './monaco'
import { HoverProvider } from './hover'
import { ContextMenuProvider } from './context-menu'
import { InlayHintProvider } from './inlay-hint'
import { ResourceProvider } from './resource'
import { InputHelperProvider } from './input-helper'
import { CompletionProvider } from './completion'
import { DiagnosticsProvider } from './diagnostics'
import { SnippetVariablesProvider } from './snippet-variables'

const formatTabSize = 4
const formatInsertSpaces = false

export type CodeEditorParams = {
  project: IXGoProject
  monaco: Monaco
  lspClient: ILSPClient
  apiReferenceProvider: IAPIReferenceProvider
  documentBase?: IDocumentBase
  completionProvider?: ICompletionProvider
  diagnosticsProvider?: IDiagnosticsProvider
  snippetVariablesProvider?: ISnippetVariablesProvider
  hoverProvider?: IHoverProvider
  contextMenuProvider?: IContextMenuProvider
  resourceProvider?: IResourceProvider
  inputHelperProvider?: IInputHelperProvider
  inlayHintProvider?: IInlayHintProvider
}

export class CodeEditor extends Disposable {
  readonly monaco: Monaco
  readonly project: IXGoProject
  private lspClient: ILSPClient
  private documentBase: IDocumentBase
  private hoverProvider: IHoverProvider
  private contextMenuProvider: IContextMenuProvider
  private resourceProvider: IResourceProvider
  private inputHelperProvider: IInputHelperProvider
  private inlayHintProvider: IInlayHintProvider
  private apiReferenceProvider: IAPIReferenceProvider
  private completionProvider: ICompletionProvider
  private diagnosticsProvider: IDiagnosticsProvider
  private snippetVariablesProvider: ISnippetVariablesProvider

  constructor(params: CodeEditorParams) {
    super()
    this.project = params.project
    this.monaco = params.monaco
    this.lspClient = params.lspClient
    this.documentBase = params.documentBase ?? new DocumentBase()
    this.resourceProvider = params.resourceProvider ?? new ResourceProvider(params.lspClient)
    this.hoverProvider = params.hoverProvider ?? new HoverProvider(params.lspClient, this.documentBase)
    this.contextMenuProvider =
      params.contextMenuProvider ?? new ContextMenuProvider(params.lspClient, this.documentBase)
    this.inlayHintProvider = params.inlayHintProvider ?? new InlayHintProvider(params.lspClient)
    this.inputHelperProvider =
      params.inputHelperProvider ?? new InputHelperProvider(params.lspClient, this.resourceProvider)
    this.apiReferenceProvider = params.apiReferenceProvider
    this.completionProvider =
      params.completionProvider ??
      new CompletionProvider(params.lspClient, this.documentBase, params.project.classFramework)
    this.diagnosticsProvider = params.diagnosticsProvider ?? new DiagnosticsProvider(params.lspClient, params.project)
    this.snippetVariablesProvider = params.snippetVariablesProvider ?? new SnippetVariablesProvider()
  }

  /**
   * All opened text documents in current editor, by resourceModel ID.
   * TODO: Remove text document if not needed anymore.
   */
  private textDocuments = new Map<string, TextDocument>()

  private addTextDocument(id: TextDocumentIdentifier) {
    const codePath = getCodeFilePath(id.uri)
    const codeOwner = this.project.getCodeOwner(codePath)
    if (codeOwner == null) throw new Error(`Invalid text document id: ${id.uri}`)
    const textDocument = new TextDocument(codeOwner, this.monaco)
    this.textDocuments.set(codeOwner.id, textDocument)
    this.addDisposable(textDocument)
    return textDocument
  }

  getTextDocument(id: TextDocumentIdentifier) {
    const codePath = getCodeFilePath(id.uri)
    const codeOwner = this.project.getCodeOwner(codePath)
    if (codeOwner == null) return null
    const textDocument = this.textDocuments.get(codeOwner.id)
    if (textDocument != null) return textDocument
    return this.addTextDocument(id)
  }

  async formatTextDocument(id: TextDocumentIdentifier) {
    const textDocument = this.getTextDocument(id)
    if (textDocument == null) return
    const edits = await this.lspClient.textDocumentFormatting(
      {},
      {
        textDocument: id,
        options: lsp.FormattingOptions.create(formatTabSize, formatInsertSpaces)
      }
    )
    if (edits == null) return
    textDocument.pushEdits(edits.map(fromLSPTextEdit))
  }

  async formatWorkspace() {
    const textDocuments = this.project
      .getCodeFiles()
      .map((path) => this.getTextDocument(getTextDocumentId(path)))
      .filter((td) => td != null)
    await Promise.all(textDocuments.map((td) => this.formatTextDocument(td.id)))
  }

  private applyWorkspaceEdit(workspaceEdit: lsp.WorkspaceEdit) {
    if (workspaceEdit.changes == null) return // For now, we support `changes` only
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      const textDocument = this.getTextDocument({ uri })
      if (textDocument == null) {
        console.warn(`Text document not found for uri: ${uri}`)
        continue
      }
      textDocument.pushEdits(edits.map(fromLSPTextEdit))
    }
  }

  async diagnosticWorkspace(signal?: AbortSignal): Promise<WorkspaceDiagnostics> {
    const diagnosticReport = await this.lspClient.workspaceDiagnostic({ signal }, { previousResultIds: [] })
    const items: TextDocumentDiagnostics[] = []
    for (const report of diagnosticReport.items) {
      if (report.kind === 'unchanged') continue // For now, we support 'full' reports only
      items.push({
        textDocument: { uri: report.uri },
        diagnostics: report.items.map(fromLSPDiagnostic)
      })
    }
    return { items }
  }

  /** Update code for renaming */
  async rename(id: TextDocumentIdentifier, position: Position, newName: string) {
    const edit = await this.lspClient.textDocumentRename(
      {},
      {
        textDocument: id,
        position: toLSPPosition(position),
        newName
      }
    )
    if (edit == null) return
    this.applyWorkspaceEdit(edit)
  }

  /** Update code for resource renaming, should be called before model name update */
  async renameResource(resource: ResourceIdentifier, newName: string) {
    const edit = await this.lspClient.workspaceExecuteCommandXGoRenameResources({}, { resource, newName })
    if (edit == null) return
    this.applyWorkspaceEdit(edit)
  }

  /** Get properties for a given target */
  async getProperties(target: string, signal?: AbortSignal): Promise<Property[]> {
    const properties = await this.lspClient.getProperties({ signal }, target)
    return filterPropertiesByDocumentation(properties, this.documentBase, this.project.classFramework.pkgPaths[0])
  }

  private uis: ICodeEditorUIController[] = []

  attachUI(ui: ICodeEditorUIController) {
    const idx = this.uis.indexOf(ui)
    if (idx >= 0) this.uis.splice(idx, 1)
    this.uis.push(ui)

    ui.registerAPIReferenceProvider(this.apiReferenceProvider)
    ui.registerCompletionProvider(this.completionProvider)
    ui.registerContextMenuProvider(this.contextMenuProvider)
    ui.registerDiagnosticsProvider(this.diagnosticsProvider)
    ui.registerHoverProvider(this.hoverProvider)
    ui.registerResourceProvider(this.resourceProvider)
    ui.registerInputHelperProvider(this.inputHelperProvider)
    ui.registerInlayHintProvider(this.inlayHintProvider)
    ui.registerDocumentBase(this.documentBase)
    ui.registerSnippetVariablesProvider(this.snippetVariablesProvider)
  }

  detachUI(ui: ICodeEditorUIController) {
    const idx = this.uis.indexOf(ui)
    if (idx !== -1) this.uis.splice(idx, 1)
  }

  getAttachedUI() {
    if (this.uis.length === 0) return null
    return this.uis[this.uis.length - 1]
  }

  dispose(): void {
    this.uis = []
    this.lspClient.dispose()
    this.diagnosticsProvider.dispose()
    super.dispose()
  }
}
