import * as lsp from 'vscode-languageserver-protocol'
import { Disposable } from '@/utils/disposable'
import Emitter from '@/utils/emitter'
import { insertSpaces, tabSize } from '@/utils/spx/highlighter'
import type { I18n } from '@/utils/i18n'
import { packageSpx } from '@/utils/spx'
import { RuntimeOutputKind, type Runtime } from '@/models/runtime'
import type { Project } from '@/models/project'
import { Copilot } from './copilot'
import { DocumentBase } from './document-base'
import { SpxLSPClient } from './lsp'
import {
  type ICodeEditorUI,
  type DiagnosticsContext,
  type IDiagnosticsProvider,
  type IResourceReferencesProvider,
  type ResourceReferencesContext,
  builtInCommandCopilotExplain,
  ChatExplainKind,
  builtInCommandCopilotReview,
  builtInCommandGoToDefinition,
  type HoverContext,
  type Hover,
  type ContextMenuContext,
  type IContextMenuProvider,
  type IHoverProvider,
  builtInCommandRename,
  type MenuItem,
  type ICompletionProvider,
  type CompletionContext,
  type CompletionItem,
  InsertTextFormat,
  CompletionItemKind,
  type IAPIReferenceProvider,
  type APIReferenceContext
} from './ui/code-editor-ui'
import {
  type Action,
  type DefinitionDocumentationItem,
  type DefinitionDocumentationString,
  type Diagnostic,
  makeAdvancedMarkdownString,
  selection2Range,
  toLSPPosition,
  fromLSPRange,
  positionEq,
  type ITextDocument,
  type Range,
  type TextDocumentIdentifier,
  type ResourceIdentifier,
  type ResourceReference,
  fromLSPTextEdit,
  textDocumentId2ResourceModelId,
  type Position,
  type Selection,
  type CommandArgs,
  getTextDocumentId,
  containsPosition,
  type WorkspaceDiagnostics,
  type TextDocumentDiagnostics,
  fromLSPDiagnostic,
  isTextDocumentStageCode,
  DiagnosticSeverity,
  textDocumentIdEq
} from './common'
import { TextDocument, createTextDocument } from './text-document'
import { type Monaco } from './monaco'

class APIReferenceProvider implements IAPIReferenceProvider {
  constructor(
    private documentBase: DocumentBase,
    private lspClient: SpxLSPClient
  ) {}

  private async getFallbackItems(ctx: APIReferenceContext) {
    const isStage = isTextDocumentStageCode(ctx.textDocument.id)
    const allItems = await this.documentBase.getAllDocumentations()
    const overviewSet = new Set<string>()
    const fallbackItems: DefinitionDocumentationItem[] = []
    for (const item of allItems) {
      if (item.hiddenFromList) continue
      if (item.definition.package === packageSpx) {
        const namespace = (item.definition.name ?? '').split('.')[0] // `Sprite` / `Game` / ...
        if (isStage && namespace === 'Sprite') continue
      }
      if (overviewSet.has(item.overview)) continue // Skip duplicated items, e.g., `Sprite.onStart` & `Game.onStart`
      overviewSet.add(item.overview)
      fallbackItems.push(item)
    }
    return fallbackItems
  }

  async provideAPIReference(ctx: APIReferenceContext, position: Position | null) {
    if (position == null) return this.getFallbackItems(ctx)

    const definitions = await this.lspClient
      .workspaceExecuteCommandSpxGetDefinitions({
        textDocument: ctx.textDocument.id,
        position: toLSPPosition(position)
      })
      .catch((e) => {
        console.warn('Failed to get definitions', e)
        return null
      })
    ctx.signal.throwIfAborted()
    let apiReferenceItems: DefinitionDocumentationItem[]
    if (definitions != null && definitions.length > 0) {
      const maybeDocumentationItems = await Promise.all(
        definitions.map(async (def) => {
          const doc = await this.documentBase.getDocumentation(def)
          if (doc == null || doc.hiddenFromList) return null
          return doc
        })
      )
      apiReferenceItems = maybeDocumentationItems.filter((d) => d != null) as DefinitionDocumentationItem[]
    } else {
      apiReferenceItems = await this.getFallbackItems(ctx)
    }
    return apiReferenceItems
  }
}

class ResourceReferencesProvider implements IResourceReferencesProvider {
  constructor(private lspClient: SpxLSPClient) {}
  async provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]> {
    return this.lspClient.getResourceReferences(ctx.textDocument.id)
  }
}

class DiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: void
  }>
  implements IDiagnosticsProvider
{
  constructor(
    private runtime: Runtime,
    private lspClient: SpxLSPClient,
    private project: Project
  ) {
    super()

    this.addDisposer(
      this.runtime.on('didChangeOutput', () => {
        this.emit('didChangeDiagnostics')
      })
    )
  }

  private adaptRuntimeDiagnosticRange({ start, end }: Range, textDocument: ITextDocument) {
    // Expand the range to whole line because the range from runtime is not accurate.
    // TODO: it's a workaround, should be fixed in the runtime (ispx) side
    if (start.line !== end.line) return { start, end }
    const line = textDocument.getLineContent(start.line)
    const leadingSpaces = line.match(/^\s*/)?.[0] ?? ''
    const lineStartPos: Position = { line: start.line, column: leadingSpaces.length + 1 }
    const lineEndPos: Position = { line: start.line, column: line.length + 1 }
    return { start: lineStartPos, end: lineEndPos }
  }

  private getRuntimeDiagnostics(ctx: DiagnosticsContext) {
    const { outputs, filesHash } = this.runtime
    if (filesHash !== this.project.filesHash) return []
    const diagnostics: Diagnostic[] = []
    for (const output of outputs) {
      if (output.kind !== RuntimeOutputKind.Error) continue
      if (output.source == null) continue
      if (!textDocumentIdEq(output.source.textDocument, ctx.textDocument.id)) continue
      const range = this.adaptRuntimeDiagnosticRange(output.source.range, ctx.textDocument)
      diagnostics.push({
        message: output.message,
        range,
        severity: DiagnosticSeverity.Error
      })
    }
    return diagnostics
  }

  private adaptLSDiagnosticRange({ start, end }: Range, textDocument: ITextDocument) {
    // make sure the range is not empty, so that the diagnostic info can be displayed as inline decorations
    // TODO: it's a workaround, should be fixed in the server side
    if (positionEq(start, end)) {
      const code = textDocument.getValue()
      let offsetStart = textDocument.getOffsetAt(start)
      let offsetEnd = offsetStart
      let adaptedByEnd = false
      for (let i = offsetEnd; i < code.length; i++) {
        if (code[i] !== '\n') {
          offsetEnd = i + 1
          adaptedByEnd = true
          break
        }
      }
      if (!adaptedByEnd) {
        for (let i = offsetStart; i >= 0; i--) {
          if (code[i] !== '\n') {
            offsetStart = i
            break
          }
        }
      }
      start = textDocument.getPositionAt(offsetStart)
      end = textDocument.getPositionAt(offsetEnd)
    }
    return { start, end }
  }

  private async getLSDiagnostics(ctx: DiagnosticsContext) {
    const diagnostics: Diagnostic[] = []
    const report = await this.lspClient.textDocumentDiagnostic({
      textDocument: ctx.textDocument.id
    })
    if (report.kind !== lsp.DocumentDiagnosticReportKind.Full)
      throw new Error(`Report kind ${report.kind} not supported`)
    for (const item of report.items) {
      const diagnostic = fromLSPDiagnostic(item)
      const range = this.adaptLSDiagnosticRange(diagnostic.range, ctx.textDocument)
      diagnostics.push({ ...diagnostic, range })
    }
    return diagnostics
  }

  async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
    return [...this.getRuntimeDiagnostics(ctx), ...(await this.getLSDiagnostics(ctx))]
  }
}

class HoverProvider implements IHoverProvider {
  constructor(
    private lspClient: SpxLSPClient,
    private documentBase: DocumentBase
  ) {}

  private async getExplainAction(textDocument: TextDocumentIdentifier, position: Position) {
    let definition: DefinitionDocumentationItem | null = null
    const defId = await this.lspClient.getDefinition(textDocument, position)
    if (defId == null) return null
    definition = await this.documentBase.getDocumentation(defId)
    if (definition == null) return null
    return {
      command: builtInCommandCopilotExplain,
      arguments: [
        {
          kind: ChatExplainKind.Definition,
          overview: definition.overview,
          definition: definition.definition
        }
      ]
    }
  }

  private async getGoToDefinitionAction(position: Position, lspParams: lsp.TextDocumentPositionParams) {
    const lspClient = this.lspClient
    const [definition, typeDefinition] = (
      await Promise.all([lspClient.textDocumentDefinition(lspParams), lspClient.textDocumentTypeDefinition(lspParams)])
    ).map((def) => {
      if (def == null) return null
      if (Array.isArray(def)) return def[0]
      return def
    })
    const location = definition ?? typeDefinition
    if (location == null) return null
    const range = fromLSPRange(location.range)
    if (containsPosition(range, position)) return null
    return {
      command: builtInCommandGoToDefinition,
      arguments: [
        {
          textDocument: { uri: location.uri },
          range
        }
      ] satisfies CommandArgs<typeof builtInCommandGoToDefinition>
    }
  }

  private async getRenameAction(ctx: HoverContext, position: Position, lspParams: lsp.TextDocumentPositionParams) {
    const lspClient = this.lspClient
    const result = await lspClient.textDocumentPrepareRename(lspParams)
    if (result == null || !lsp.Range.is(result)) return null // For now, we support Range only
    return {
      command: builtInCommandRename,
      arguments: [
        {
          textDocument: ctx.textDocument.id,
          position,
          range: fromLSPRange(result)
        }
      ] satisfies CommandArgs<typeof builtInCommandRename>
    }
  }

  async provideHover(ctx: HoverContext, position: Position): Promise<Hover | null> {
    const lspParams = {
      textDocument: ctx.textDocument.id,
      position: toLSPPosition(position)
    }
    const lspHover = await this.lspClient.textDocumentHover(lspParams)
    if (lspHover == null) return null
    const contents: DefinitionDocumentationString[] = []
    if (lsp.MarkupContent.is(lspHover.contents)) {
      // For now, we support MarkupContent only
      contents.push(makeAdvancedMarkdownString(lspHover.contents.value))
    }
    let range: Range | undefined = undefined
    if (lspHover.range != null) range = fromLSPRange(lspHover.range)
    const maybeActions = await Promise.all([
      this.getExplainAction(ctx.textDocument.id, position),
      this.getGoToDefinitionAction(position, lspParams),
      this.getRenameAction(ctx, position, lspParams)
    ])
    const actions = maybeActions.filter((a) => a != null) as Action[]
    return { contents, range, actions }
  }
}

class CompletionProvider implements ICompletionProvider {
  constructor(
    private lspClient: SpxLSPClient,
    private documentBase: DocumentBase
  ) {}

  private getCompletionItemKind(kind: lsp.CompletionItemKind | undefined): CompletionItemKind {
    switch (kind) {
      case lsp.CompletionItemKind.Method:
      case lsp.CompletionItemKind.Function:
      case lsp.CompletionItemKind.Constructor:
        return CompletionItemKind.Function
      case lsp.CompletionItemKind.Field:
      case lsp.CompletionItemKind.Variable:
      case lsp.CompletionItemKind.Property:
        return CompletionItemKind.Variable
      case lsp.CompletionItemKind.Interface:
      case lsp.CompletionItemKind.Enum:
      case lsp.CompletionItemKind.Struct:
      case lsp.CompletionItemKind.TypeParameter:
        return CompletionItemKind.Type
      case lsp.CompletionItemKind.Module:
        return CompletionItemKind.Package
      case lsp.CompletionItemKind.Keyword:
      case lsp.CompletionItemKind.Operator:
        return CompletionItemKind.Statement
      case lsp.CompletionItemKind.EnumMember:
      case lsp.CompletionItemKind.Text:
      case lsp.CompletionItemKind.Constant:
        return CompletionItemKind.Constant
      default:
        return CompletionItemKind.Unknown
    }
  }

  private getInsertTextFormat(insertTextFormat: lsp.InsertTextFormat | undefined): InsertTextFormat {
    switch (insertTextFormat) {
      case lsp.InsertTextFormat.Snippet:
        return InsertTextFormat.Snippet
      default:
        return InsertTextFormat.PlainText
    }
  }

  async provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]> {
    const items = await this.lspClient.getCompletionItems({
      textDocument: ctx.textDocument.id,
      position: toLSPPosition(position)
    })
    const maybeItems = await Promise.all(
      items.map(async (item) => {
        const result: CompletionItem = {
          label: item.label,
          kind: this.getCompletionItemKind(item.kind),
          insertText: item.label,
          insertTextFormat: InsertTextFormat.PlainText,
          documentation: null
        }

        if (item.insertText != null) {
          result.insertText = item.insertText
          result.insertTextFormat = this.getInsertTextFormat(item.insertTextFormat)
        }

        const defId = item.data?.definition
        const definition = defId != null ? await this.documentBase.getDocumentation(defId) : null

        // Skip APIs from spx while without documentation, they are assumed not recommended
        if (defId != null && defId.package === packageSpx && definition == null) return null
        if (definition != null && definition.hiddenFromList) return null

        if (definition != null) {
          result.kind = definition.kind
          result.insertText = definition.insertText
          result.insertTextFormat = InsertTextFormat.Snippet
          result.documentation = definition.detail
        }

        if (item.documentation != null) {
          const docStr = lsp.MarkupContent.is(item.documentation) ? item.documentation.value : item.documentation
          result.documentation = makeAdvancedMarkdownString(docStr)
        }

        return result
      })
    )
    return maybeItems.filter((item) => item != null) as CompletionItem[]
  }
}

class ContextMenuProvider implements IContextMenuProvider {
  constructor(
    private lspClient: SpxLSPClient,
    private documentBase: DocumentBase
  ) {}

  private async getExplainMenuItemForPosition({ textDocument }: ContextMenuContext, position: Position) {
    const defId = await this.lspClient.getDefinition(textDocument.id, position)
    if (defId == null) return null
    const definition = await this.documentBase.getDocumentation(defId)
    if (definition == null) return null
    return {
      command: builtInCommandCopilotExplain,
      arguments: [
        {
          kind: ChatExplainKind.Definition,
          overview: definition.overview,
          definition: definition.definition
        }
      ] satisfies CommandArgs<typeof builtInCommandCopilotExplain>
    }
  }

  private async getRenameMenuItemForPosition({ textDocument }: ContextMenuContext, position: Position) {
    const lspParams = {
      textDocument: textDocument.id,
      position: toLSPPosition(position)
    }
    const result = await this.lspClient.textDocumentPrepareRename(lspParams)
    if (result == null || !lsp.Range.is(result)) return null // For now, we support Range only
    return {
      command: builtInCommandRename,
      arguments: [
        {
          textDocument: textDocument.id,
          position,
          range: fromLSPRange(result)
        }
      ] satisfies CommandArgs<typeof builtInCommandRename>
    }
  }

  async provideContextMenu(ctx: ContextMenuContext, position: Position) {
    const maybeMenuItems: Array<MenuItem | null> = await Promise.all([
      this.getExplainMenuItemForPosition(ctx, position),
      this.getRenameMenuItemForPosition(ctx, position)
    ])
    return maybeMenuItems.filter((item) => item != null) as MenuItem[]
  }

  async provideSelectionContextMenu({ textDocument }: ContextMenuContext, selection: Selection) {
    const range = selection2Range(selection)
    const code = textDocument.getValueInRange(range)
    return [
      {
        command: builtInCommandCopilotExplain,
        arguments: [
          {
            kind: ChatExplainKind.CodeSegment,
            codeSegment: {
              textDocument: textDocument.id,
              range,
              content: code
            }
          }
        ] satisfies CommandArgs<typeof builtInCommandCopilotExplain>
      },
      {
        command: builtInCommandCopilotReview,
        arguments: [
          {
            textDocument: textDocument.id,
            range,
            code
          }
        ] satisfies CommandArgs<typeof builtInCommandCopilotReview>
      }
    ]
  }
}

export class CodeEditor extends Disposable {
  private copilot: Copilot
  private documentBase: DocumentBase
  private lspClient: SpxLSPClient
  private apiReferenceProvider: APIReferenceProvider
  private completionProvider: CompletionProvider
  private contextMenuProvider: ContextMenuProvider
  private resourceReferencesProvider: ResourceReferencesProvider
  private diagnosticsProvider: DiagnosticsProvider
  private hoverProvider: HoverProvider

  constructor(
    private project: Project,
    private runtime: Runtime,
    private monaco: Monaco,
    private i18n: I18n
  ) {
    super()
    this.copilot = new Copilot(i18n, project)
    this.documentBase = new DocumentBase()
    this.lspClient = new SpxLSPClient(project)
    this.apiReferenceProvider = new APIReferenceProvider(this.documentBase, this.lspClient)
    this.completionProvider = new CompletionProvider(this.lspClient, this.documentBase)
    this.contextMenuProvider = new ContextMenuProvider(this.lspClient, this.documentBase)
    this.resourceReferencesProvider = new ResourceReferencesProvider(this.lspClient)
    this.diagnosticsProvider = new DiagnosticsProvider(this.runtime, this.lspClient, this.project)
    this.hoverProvider = new HoverProvider(this.lspClient, this.documentBase)
  }

  /** All opened text documents in current editor, by resourceModel ID */
  private textDocuments = new Map<string, TextDocument>()

  private addTextDocument(id: TextDocumentIdentifier) {
    const resourceModelId = textDocumentId2ResourceModelId(id, this.project)
    if (resourceModelId == null) throw new Error(`Invalid text document id: ${id.uri}`)
    const textDocument = createTextDocument(resourceModelId, this.project, this.monaco)
    this.textDocuments.set(resourceModelId.toString(), textDocument)
    this.addDisposable(textDocument)
    return textDocument
  }

  getTextDocument(id: TextDocumentIdentifier) {
    const resourceModelId = textDocumentId2ResourceModelId(id, this.project)
    if (resourceModelId == null) {
      return null
    }
    const textDocument = this.textDocuments.get(resourceModelId.toString())
    if (textDocument != null) return textDocument
    return this.addTextDocument(id)
  }

  async formatTextDocument(id: TextDocumentIdentifier) {
    const textDocument = this.getTextDocument(id)
    if (textDocument == null) return
    const edits = await this.lspClient.textDocumentFormatting({
      textDocument: id,
      options: lsp.FormattingOptions.create(tabSize, insertSpaces)
    })
    if (edits == null) return
    textDocument.pushEdits(edits.map(fromLSPTextEdit))
  }

  async formatWorkspace() {
    const { stage, sprites } = this.project
    const textDocuments = [stage.codeFilePath, ...sprites.map((s) => s.codeFilePath)]
      .map((codeFilePath) => this.getTextDocument(getTextDocumentId(codeFilePath)))
      .filter((td) => td != null) as TextDocument[]
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

  async diagnosticWorkspace(): Promise<WorkspaceDiagnostics> {
    const diagnosticReport = await this.lspClient.workspaceDiagnostic({ previousResultIds: [] })
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
    const edit = await this.lspClient.textDocumentRename({
      textDocument: id,
      position: toLSPPosition(position),
      newName
    })
    if (edit == null) return
    this.applyWorkspaceEdit(edit)
  }

  /** Update code for resource renaming, should be called before model name update */
  async renameResource(resource: ResourceIdentifier, newName: string) {
    const edit = await this.lspClient.workspaceExecuteCommandSpxRenameResources({ resource, newName })
    if (edit == null) return
    this.applyWorkspaceEdit(edit)
  }

  private uis: ICodeEditorUI[] = []

  attachUI(ui: ICodeEditorUI) {
    const idx = this.uis.indexOf(ui)
    if (idx >= 0) this.uis.splice(idx, 1)
    this.uis.push(ui)

    ui.registerAPIReferenceProvider(this.apiReferenceProvider)
    ui.registerCompletionProvider(this.completionProvider)
    ui.registerContextMenuProvider(this.contextMenuProvider)
    ui.registerCopilot(this.copilot)
    ui.registerDiagnosticsProvider(this.diagnosticsProvider)
    ui.registerHoverProvider(this.hoverProvider)
    ui.registerResourceReferencesProvider(this.resourceReferencesProvider)
    ui.registerDocumentBase(this.documentBase)
  }

  detachUI(ui: ICodeEditorUI) {
    const idx = this.uis.indexOf(ui)
    if (idx !== -1) this.uis.splice(idx, 1)
  }

  getAttachedUI() {
    if (this.uis.length === 0) return null
    return this.uis[this.uis.length - 1]
  }

  init() {
    this.lspClient.init()
  }

  dispose(): void {
    this.uis = []
    this.lspClient.dispose()
    this.documentBase.dispose()
    this.copilot.dispose()
    super.dispose()
  }
}
