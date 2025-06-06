import { once } from 'lodash'
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
  type IInputHelperProvider,
  type InputHelperContext,
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
  type APIReferenceContext,
  type IInlayHintProvider,
  type InlayHintItem,
  type InlayHintContext,
  InlayHintKind
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
  textDocumentIdEq,
  fromLSPPosition,
  toLSPRange,
  type InputSlot,
  rangeContains
} from './common'
import { TextDocument, createTextDocument } from './text-document'
import { type Monaco } from './monaco'
import * as z from 'zod'
import { ToolRegistry } from '@/components/copilot/mcp/registry'
import {
  writeToFileToolDescription,
  WriteToFileArgsSchema,
  ListFilesArgsSchema,
  listFilesToolDescription,
  GetDiagnosticsArgsSchema,
  getDiagnosticsToolDescription,
  GetFileCodeArgsSchema,
  getFileCodeToolDescription
} from '@/components/copilot/mcp/definitions'

/** Definition ID string for APIReference items */
const apiReferenceItems = [
  'gop:fmt?println',
  `gop:${packageSpx}?rand#0`,
  `gop:${packageSpx}?rand#1`,
  `gop:${packageSpx}?exit#1`,
  `gop:${packageSpx}?forever`,
  `gop:${packageSpx}?repeat`,
  `gop:${packageSpx}?repeatUntil`,

  `gop:${packageSpx}?Game.wait`,
  `gop:${packageSpx}?Game.waitUntil`,
  `gop:${packageSpx}?Game.timer`,
  `gop:${packageSpx}?Game.resetTimer`,

  `gop:${packageSpx}?Game.onStart`,
  `gop:${packageSpx}?Game.onClick`,
  `gop:${packageSpx}?Game.onKey#0`,
  `gop:${packageSpx}?Game.onMsg#1`,

  `gop:${packageSpx}?Game.mouseX`,
  `gop:${packageSpx}?Game.mouseY`,
  `gop:${packageSpx}?Game.keyPressed`,
  `gop:${packageSpx}?Game.getWidget`,
  `gop:${packageSpx}?Mouse`,

  `gop:${packageSpx}?Game.ask`,
  `gop:${packageSpx}?Sprite.ask`,
  `gop:${packageSpx}?Game.answer`,

  `gop:${packageSpx}?Game.onBackdrop#1`,
  `gop:${packageSpx}?Game.backdropName`,
  `gop:${packageSpx}?Game.backdropIndex`,
  `gop:${packageSpx}?Game.prevBackdrop#0`,
  `gop:${packageSpx}?Game.nextBackdrop#0`,
  `gop:${packageSpx}?Game.startBackdrop#0`,

  `gop:${packageSpx}?Game.broadcast#0`,

  `gop:${packageSpx}?Game.play#3`,
  `gop:${packageSpx}?Game.play#4`,
  `gop:${packageSpx}?Game.stopAllSounds`,
  `gop:${packageSpx}?PlayContinue`,
  `gop:${packageSpx}?PlayPause`,
  `gop:${packageSpx}?PlayResume`,
  `gop:${packageSpx}?PlayRewind`,
  `gop:${packageSpx}?PlayStop`,

  `gop:${packageSpx}?Game.volume`,
  `gop:${packageSpx}?Game.changeVolume`,
  `gop:${packageSpx}?Game.setVolume`,

  `gop:${packageSpx}?Game.changeEffect`,
  `gop:${packageSpx}?Game.setEffect`,
  `gop:${packageSpx}?Game.clearGraphicEffects`,

  `gop:${packageSpx}?Sprite.onStart`,
  `gop:${packageSpx}?Sprite.onClick`,
  `gop:${packageSpx}?Sprite.onKey#0`,
  `gop:${packageSpx}?Sprite.onMsg#1`,

  `gop:${packageSpx}?Sprite.animate`,

  `gop:${packageSpx}?Sprite.bounceOffEdge`,

  `gop:${packageSpx}?Sprite.heading`,
  `gop:${packageSpx}?Sprite.turn#0`,
  `gop:${packageSpx}?Sprite.turnTo#2`,
  `gop:${packageSpx}?Sprite.turnTo#1`,
  `gop:${packageSpx}?Sprite.turnTo#3`,
  `gop:${packageSpx}?Sprite.changeHeading`,
  `gop:${packageSpx}?Sprite.setHeading`,
  `gop:${packageSpx}?Up`,
  `gop:${packageSpx}?Down`,
  `gop:${packageSpx}?Left`,
  `gop:${packageSpx}?Right`,

  `gop:${packageSpx}?Sprite.size`,
  `gop:${packageSpx}?Sprite.changeSize`,
  `gop:${packageSpx}?Sprite.setSize`,

  `gop:${packageSpx}?Sprite.xpos`,
  `gop:${packageSpx}?Sprite.ypos`,
  `gop:${packageSpx}?Sprite.step#0`,
  `gop:${packageSpx}?Sprite.glide#0`,
  `gop:${packageSpx}?Sprite.glide#2`,
  `gop:${packageSpx}?Sprite.glide#3`,
  `gop:${packageSpx}?Sprite.goto#1`,
  `gop:${packageSpx}?Sprite.goto#2`,
  `gop:${packageSpx}?Sprite.changeXpos`,
  `gop:${packageSpx}?Sprite.setXpos`,
  `gop:${packageSpx}?Sprite.changeYpos`,
  `gop:${packageSpx}?Sprite.setYpos`,

  `gop:${packageSpx}?Sprite.clone#0`,

  `gop:${packageSpx}?Sprite.costumeName`,
  `gop:${packageSpx}?Sprite.setCostume#0`,

  `gop:${packageSpx}?Sprite.setRotationStyle`,
  `gop:${packageSpx}?None`,
  `gop:${packageSpx}?Normal`,
  `gop:${packageSpx}?LeftRight`,

  `gop:${packageSpx}?Sprite.die`,

  `gop:${packageSpx}?Sprite.touching#0`,
  `gop:${packageSpx}?Sprite.touching#2`,
  `gop:${packageSpx}?Sprite.distanceTo#1`,
  `gop:${packageSpx}?Sprite.distanceTo#2`,

  `gop:${packageSpx}?Edge`,
  `gop:${packageSpx}?EdgeBottom`,
  `gop:${packageSpx}?EdgeLeft`,
  `gop:${packageSpx}?EdgeRight`,
  `gop:${packageSpx}?EdgeTop`,

  `gop:${packageSpx}?Sprite.visible`,
  `gop:${packageSpx}?Sprite.show`,
  `gop:${packageSpx}?Sprite.hide`,
  `gop:${packageSpx}?Sprite.gotoFront`,
  `gop:${packageSpx}?Sprite.gotoBack`,
  `gop:${packageSpx}?Sprite.goBackLayers`,

  `gop:${packageSpx}?Sprite.onCloned#0`,
  `gop:${packageSpx}?Sprite.onMoving#0`,
  `gop:${packageSpx}?Sprite.onTouchStart#0`,
  `gop:${packageSpx}?Sprite.onTouchStart#2`,
  `gop:${packageSpx}?Sprite.onTurning#0`,

  `gop:${packageSpx}?Sprite.say#0`,
  `gop:${packageSpx}?Sprite.say#1`,
  `gop:${packageSpx}?Sprite.think#0`,
  `gop:${packageSpx}?Sprite.think#1`,

  `gop:${packageSpx}?Sprite.changeEffect`,
  `gop:${packageSpx}?Sprite.setEffect`,
  `gop:${packageSpx}?Sprite.clearGraphicEffects`

  // TODO: definitions like `if-else` / `var`?
]

class APIReferenceProvider implements IAPIReferenceProvider {
  constructor(private documentBase: DocumentBase) {}

  private parseName(name: string | undefined): [receiver: string | null, method: string] {
    const parts = (name ?? '').split('.')
    if (parts.length > 1) return [parts[0], parts[1]]
    return [null, parts[0]]
  }

  private getStageAPIReferenceItems = once(async () => {
    const maybeItems = await Promise.all(apiReferenceItems.map((id) => this.documentBase.getDocumentation(id)))
    const allItems = maybeItems.filter((i) => i != null) as DefinitionDocumentationItem[]
    return allItems.filter((item) => {
      if (item.definition.package !== packageSpx) return true
      const [receiver] = this.parseName(item.definition.name)
      return receiver == null || receiver === 'Game'
    })
  })

  private getSpriteAPIReferenceItems = once(async () => {
    const maybeItems = await Promise.all(apiReferenceItems.map((id) => this.documentBase.getDocumentation(id)))
    const allItems = maybeItems.filter((i) => i != null) as DefinitionDocumentationItem[]
    const spriteMethods = allItems.reduce((set, item) => {
      const [receiver, method] = this.parseName(item.definition.name)
      if (receiver === 'Sprite') set.add(method)
      return set
    }, new Set<string>())
    return allItems.filter((item) => {
      if (item.definition.package !== packageSpx) return true
      const [receiver, method] = this.parseName(item.definition.name)
      if (receiver == null || receiver === 'Sprite') return true
      if (receiver === 'Game' && !spriteMethods.has(method)) return true // Skip Game methods overridden by Sprite
      return false
    })
  })

  async provideAPIReference(ctx: APIReferenceContext) {
    const isStage = isTextDocumentStageCode(ctx.textDocument.id)
    if (isStage) return this.getStageAPIReferenceItems()
    return this.getSpriteAPIReferenceItems()
  }
}

class ResourceReferencesProvider implements IResourceReferencesProvider {
  constructor(private lspClient: SpxLSPClient) {}
  async provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]> {
    return this.lspClient.getResourceReferences(ctx.textDocument.id)
  }
}

class InputHelperProvider implements IInputHelperProvider {
  constructor(private lspClient: SpxLSPClient) {}
  async provideInputSlots(ctx: InputHelperContext): Promise<InputSlot[]> {
    const slots = await this.lspClient.getInputSlots(ctx.textDocument.id)
    return slots.filter((slot) => {
      if (slots.some((s) => s !== slot && rangeContains(s.range, slot.range))) return false
      return true
    })
  }
}

class InlayHintProvider implements IInlayHintProvider {
  constructor(private lspClient: SpxLSPClient) {}
  async provideInlayHints(ctx: InlayHintContext): Promise<InlayHintItem[]> {
    const lspInlayHints = await this.lspClient.textDocumentInlayHint({
      textDocument: ctx.textDocument.id,
      range: toLSPRange(ctx.textDocument.getFullRange())
    })
    const result: InlayHintItem[] = []
    if (lspInlayHints == null) return result
    for (const ih of lspInlayHints) {
      const kind = ih.kind ?? lsp.InlayHintKind.Parameter
      if (kind === lsp.InlayHintKind.Parameter && typeof ih.label === 'string') {
        const label = ih.label
        const position = fromLSPPosition(ih.position)
        result.push({ label, kind: InlayHintKind.Parameter, position })
      }
    }
    return result
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
    const lineContent = ctx.textDocument.getLineContent(position.line)
    const isLineEnd = lineContent.length === position.column - 1
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
          result.documentation = definition.detail
          if (isLineEnd) {
            // Typically the insertSnippet in definition stands for whole call expression of the API,
            // the insertText from LS stands for identifier of the API.
            // If the inputting happens at the end of the line, we assume the user prefers the call expression.
            // TODO: More reliable mechanism to determine the preference.
            result.insertText = definition.insertSnippet
            result.insertTextFormat = InsertTextFormat.Snippet
          }
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

type WriteToFileOptions = z.infer<typeof WriteToFileArgsSchema>

export class CodeEditor extends Disposable {
  private copilot: Copilot
  private documentBase: DocumentBase
  private lspClient: SpxLSPClient
  private apiReferenceProvider: APIReferenceProvider
  private completionProvider: CompletionProvider
  private contextMenuProvider: ContextMenuProvider
  private resourceReferencesProvider: ResourceReferencesProvider
  private inputHelperProvider: InputHelperProvider
  private inlayHintProvider: InlayHintProvider
  private diagnosticsProvider: DiagnosticsProvider
  private hoverProvider: HoverProvider

  constructor(
    private project: Project,
    private runtime: Runtime,
    private monaco: Monaco,
    private i18n: I18n,
    private registry: ToolRegistry
  ) {
    super()
    this.copilot = new Copilot(i18n, project)
    this.documentBase = new DocumentBase()
    this.lspClient = new SpxLSPClient(project)
    this.apiReferenceProvider = new APIReferenceProvider(this.documentBase)
    this.completionProvider = new CompletionProvider(this.lspClient, this.documentBase)
    this.contextMenuProvider = new ContextMenuProvider(this.lspClient, this.documentBase)
    this.resourceReferencesProvider = new ResourceReferencesProvider(this.lspClient)
    this.inputHelperProvider = new InputHelperProvider(this.lspClient)
    this.inlayHintProvider = new InlayHintProvider(this.lspClient)
    this.diagnosticsProvider = new DiagnosticsProvider(this.runtime, this.lspClient, this.project)
    this.hoverProvider = new HoverProvider(this.lspClient, this.documentBase)
  }

  registerMCPTools(): void {
    // Register tools for code editor
    this.registry.registerTools(
      [
        {
          description: writeToFileToolDescription,
          implementation: {
            validate: (args) => {
              const result = WriteToFileArgsSchema.safeParse(args)
              if (!result.success) {
                throw new Error(`Invalid arguments for ${writeToFileToolDescription.name}: ${result.error}`)
              }
              return result.data
            },
            execute: async (args) => {
              const result = this.writeToFile(args)
              return result
            }
          }
        },
        {
          description: listFilesToolDescription,
          implementation: {
            validate: (args) => {
              const result = ListFilesArgsSchema.safeParse(args)
              if (!result.success) {
                throw new Error(`Invalid arguments for ${listFilesToolDescription.name}: ${result.error}`)
              }
              return result.data
            },
            execute: async () => {
              return this.listFiles()
            }
          }
        },
        {
          description: getDiagnosticsToolDescription,
          implementation: {
            validate: (args) => {
              const result = GetDiagnosticsArgsSchema.safeParse(args)
              if (!result.success) {
                throw new Error(`Invalid arguments for ${getDiagnosticsToolDescription.name}: ${result.error}`)
              }
              return result.data
            },
            execute: async () => {
              return this.getDiagnostics()
            }
          }
        },
        {
          description: getFileCodeToolDescription,
          implementation: {
            validate: (args) => {
              const result = GetFileCodeArgsSchema.safeParse(args)
              if (!result.success) {
                throw new Error(`Invalid arguments for ${getFileCodeToolDescription.name}: ${result.error}`)
              }
              return result.data
            },
            execute: async (args: z.infer<typeof GetFileCodeArgsSchema>) => {
              const file = this.getTextDocument({ uri: args.file })
              if (file == null) return null

              const content = file.getValue()
              return {
                success: true,
                message: `Successfully get code from ${args.file} <file-content file="${args.file}">${content}</file-content>`
              }
            }
          }
        }
      ],
      'code-editor'
    )
  }

  async getDiagnostics(args?: { file?: string }) {
    try {
      const files = args?.file
        ? [{ name: args.file.split('/').pop() || args.file, uri: args.file }]
        : (await this.listFiles()).data

      const diagnosticsPromises = files.map(async (file) => {
        try {
          const textDocument = this.getTextDocument({ uri: file.uri })
          if (!textDocument) {
            console.warn(`File not found: ${file.uri}`)
            return { file: file.uri, name: file.name, diagnostics: [] }
          }

          const diagnostics = await this.diagnosticsProvider.provideDiagnostics({
            textDocument,
            signal: new AbortController().signal
          })

          return {
            file: file.uri,
            name: file.name,
            diagnostics: diagnostics.map((diag) => ({
              line: diag.range.start.line,
              column: diag.range.start.column,
              message: diag.message
            }))
          }
        } catch (error) {
          console.error(`Error getting diagnostics for ${file.uri}:`, error)
          return {
            file: file.uri,
            name: file.name,
            diagnostics: [
              {
                line: 0,
                column: 0,
                message: `Error analyzing file: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          }
        }
      })

      const allDiagnostics = await Promise.all(diagnosticsPromises)

      const formattedDiagnostics = allDiagnostics
        .map((fileResult) => {
          const diagnosticMessages = fileResult.diagnostics
            .map((diag) => `- ${diag.message} ${fileResult.name} [${diag.line},${diag.column}]`)
            .join('\n')

          return `<pre is="file-diagnostics" file="${fileResult.file}">\n${
            fileResult.diagnostics.length > 0 ? diagnosticMessages : '- No diagnostics'
          }\n</pre>`
        })
        .join('\n\n')

      return {
        success: true,
        message: formattedDiagnostics,
        data: allDiagnostics
      }
    } catch (error) {
      console.error('Failed to get diagnostics:', error)
      return {
        success: false,
        message: `Failed to get diagnostics: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  // * - `file:///main.spx`
  // * - `file:///<spriteName>.spx`
  async listFiles() {
    const files = []
    files.push({
      name: 'main.spx',
      uri: 'file:///main.spx'
    })

    // Add sprite files
    const sprites = this.project.sprites
    for (const sprite of sprites) {
      files.push({
        name: `${sprite.name}.spx`,
        uri: `file:///${sprite.name}.spx`
      })
    }

    const formattedList = files.map((file) => `- ${file.uri}`).join('\n')
    const message = `<file-list>\n${formattedList}\n</file-list>`
    return {
      success: true,
      message: message,
      data: files
    }
  }

  async writeToFile(args: WriteToFileOptions) {
    const code = args.content
    const file = args.file

    try {
      const targetDoc = this.getTextDocument({ uri: file })
      if (!targetDoc) {
        throw new Error(`File not found: ${file}`)
      }

      this.getAttachedUI()?.open(targetDoc.id)

      targetDoc.setValue(code)

      const diagnostics = await this.getDiagnostics({ file })
      const files = await this.listFiles()
      const finallyCode = targetDoc.getValue()
      const finallyFileContent = `<pre is="final-file-content" file="${file}">${finallyCode}</pre>`
      let message = `Code successfully inserted into ${file}.
        
      Here is the full, updated content of the file that was saved:\n
       ${finallyFileContent}
      \n\nIMPORTANT: For any future changes to this file, use the final-file-content shown above as your reference. This content reflects the current state of the file, including any auto-formatting (e.g., if you used single quotes but the formatter converted them to double quotes). Always base your SEARCH/REPLACE operations on this final version to ensure accuracy.`

      if (files.data && files.data.length > 0) {
        message += `\n\nHere is the list of files in the project:\n${files.message}`
      }

      if (diagnostics.data && diagnostics.data.length > 0) {
        message += `\n\nNew problems detected after saving the file, If you have defined a function, please make sure to place the function definition before all event handlers (such as onStart, onClick):\n${diagnostics.message}`
      }
      return {
        success: true,
        message: message
      }
    } catch (error) {
      console.error('Error inserting code:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred during code insertion'
      }
    }
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
    ui.registerInputHelperProvider(this.inputHelperProvider)
    ui.registerInlayHintProvider(this.inlayHintProvider)
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
    this.registerMCPTools()
    this.lspClient.init()
  }

  dispose(): void {
    this.registry.unregisterProviderTools('code-editor')
    this.uis = []
    this.lspClient.dispose()
    this.documentBase.dispose()
    this.copilot.dispose()
    this.diagnosticsProvider.dispose()
    super.dispose()
  }
}
