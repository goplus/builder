import * as lsp from 'vscode-languageserver-protocol'
import { shallowRef, type ShallowRef } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { History } from '@/components/editor/history'
import type { IXGoProject } from './project'
import { type IDocumentBase, DocumentBase } from './document-base'
import type { ILSPClient } from './lsp/types'
import { EmptyAPIReferenceProvider } from './api-reference'
import {
  type ICodeEditorUIController,
  type IDiagnosticsProvider,
  type IResourceAdapter,
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
  DiagnosticSeverity,
  type Property
} from './common'
import { filterPropertiesByDocumentation } from './utils'
import { TextDocument } from './text-document'
import { type Monaco } from './monaco'
import { HoverProvider } from './hover'
import { ContextMenuProvider } from './context-menu'
import { InlayHintProvider } from './inlay-hint'
import { ResourceAdapter } from './resource'
import { InputHelperProvider } from './input-helper'
import { CompletionProvider } from './completion'
import { DiagnosticsProvider } from './diagnostics'
import { SnippetVariablesProvider } from './snippet-variables'
import type { ICopilot } from './copilot'

const formatTabSize = 4
const formatInsertSpaces = false

export type CodeEditorParams = {
  project: IXGoProject
  history: History
  copilot?: ICopilot | null
  monaco: Monaco
  lspClient: ILSPClient
  documentBase?: IDocumentBase
}

export class CodeEditor extends Disposable {
  readonly monaco: Monaco
  readonly project: IXGoProject
  readonly history: History
  readonly copilot: ICopilot | null
  readonly lspClient: ILSPClient
  readonly documentBase: IDocumentBase

  constructor(params: CodeEditorParams) {
    super()
    this.project = params.project
    this.history = params.history
    this.copilot = params.copilot ?? null
    this.monaco = params.monaco
    this.lspClient = params.lspClient
    const documentBase = params.documentBase ?? new DocumentBase()
    this.documentBase = documentBase
    this.resourceAdapterRef = shallowRef(new ResourceAdapter(params.lspClient))
    this.hoverProviderRef = shallowRef(new HoverProvider(params.lspClient, documentBase))
    this.contextMenuProviderRef = shallowRef(new ContextMenuProvider(params.lspClient, documentBase))
    this.inlayHintProviderRef = shallowRef(new InlayHintProvider(params.lspClient))
    this.inputHelperProviderRef = shallowRef(new InputHelperProvider(params.lspClient, () => this.resourceAdapter))
    this.apiReferenceProviderRef = shallowRef(new EmptyAPIReferenceProvider())
    this.completionProviderRef = shallowRef(
      new CompletionProvider(params.lspClient, documentBase, params.project.classFramework)
    )
    this.diagnosticsProviderRef = shallowRef(new DiagnosticsProvider(params.lspClient, params.project))
    this.snippetVariablesProviderRef = shallowRef(new SnippetVariablesProvider())
  }

  private hoverProviderRef: ShallowRef<IHoverProvider>
  get hoverProvider() {
    return this.hoverProviderRef.value
  }
  registerHoverProvider(provider: IHoverProvider) {
    this.hoverProviderRef.value = provider
  }

  private contextMenuProviderRef: ShallowRef<IContextMenuProvider>
  get contextMenuProvider() {
    return this.contextMenuProviderRef.value
  }
  registerContextMenuProvider(provider: IContextMenuProvider) {
    this.contextMenuProviderRef.value = provider
  }

  private resourceAdapterRef: ShallowRef<IResourceAdapter>
  get resourceAdapter() {
    return this.resourceAdapterRef.value
  }
  registerResourceAdapter(adapter: IResourceAdapter) {
    this.resourceAdapterRef.value = adapter
  }

  private inputHelperProviderRef: ShallowRef<IInputHelperProvider>
  get inputHelperProvider() {
    return this.inputHelperProviderRef.value
  }
  registerInputHelperProvider(provider: IInputHelperProvider) {
    this.inputHelperProviderRef.value = provider
  }

  private inlayHintProviderRef: ShallowRef<IInlayHintProvider>
  get inlayHintProvider() {
    return this.inlayHintProviderRef.value
  }
  registerInlayHintProvider(provider: IInlayHintProvider) {
    this.inlayHintProviderRef.value = provider
  }

  private apiReferenceProviderRef: ShallowRef<IAPIReferenceProvider>
  get apiReferenceProvider() {
    return this.apiReferenceProviderRef.value
  }
  registerAPIReferenceProvider(provider: IAPIReferenceProvider) {
    this.apiReferenceProviderRef.value = provider
  }

  private completionProviderRef: ShallowRef<ICompletionProvider>
  get completionProvider() {
    return this.completionProviderRef.value
  }
  registerCompletionProvider(provider: ICompletionProvider) {
    this.completionProviderRef.value = provider
  }

  private diagnosticsProviderRef: ShallowRef<IDiagnosticsProvider>
  get diagnosticsProvider() {
    return this.diagnosticsProviderRef.value
  }
  registerDiagnosticsProvider(provider: IDiagnosticsProvider) {
    this.diagnosticsProviderRef.value = provider
  }

  private snippetVariablesProviderRef: ShallowRef<ISnippetVariablesProvider>
  get snippetVariablesProvider() {
    return this.snippetVariablesProviderRef.value
  }
  registerSnippetVariablesProvider(provider: ISnippetVariablesProvider) {
    this.snippetVariablesProviderRef.value = provider
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

  /** Get the warning shown before renaming when the workspace has diagnostics errors. */
  async getRenameWarning() {
    const result = await this.diagnosticWorkspace()
    const hasError = result.items.some((item) =>
      item.diagnostics.some((diagnostic) => diagnostic.severity === DiagnosticSeverity.Error)
    )
    if (!hasError) return null
    return {
      en: 'There are errors in the project code. Some references may not be updated automatically. You can check the code and update them manually after renaming.',
      zh: '当前项目代码中存在错误，部分引用可能不会自动更新，你可以在重命名后检查代码并手动修改。'
    }
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
