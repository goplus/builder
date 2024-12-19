import { DocumentDiagnosticReportKind } from 'vscode-languageserver-protocol'
import { Disposable } from '@/utils/disposable'
import Emitter from '@/utils/emitter'
import type { Runtime } from '@/models/runtime'
import type { Project } from '@/models/project'
import { Copilot } from './copilot'
import { DocumentBase } from './document-base'
import { SpxLSPClient } from './lsp'
import {
  type ICodeEditorUI,
  type DiagnosticsContext,
  type IDiagnosticsProvider,
  type IResourceReferencesProvider,
  type ResourceReference,
  type ResourceReferencesContext,
  builtInCommandCopilotExplain,
  ChatExplainKind,
  type ChatExplainTargetCodeSegment,
  builtInCommandCopilotReview,
  type ChatTopicReview,
  builtInCommandGoToDefinition
} from './ui/code-editor-ui'
import {
  makeBasicMarkdownString,
  type Action,
  type DefinitionDocumentationItem,
  type DefinitionDocumentationString,
  type DefinitionIdentifier,
  type Diagnostic,
  makeAdvancedMarkdownString,
  stringifyDefinitionId,
  selection2Range,
  toLSPPosition,
  fromLSPRange,
  fromLSPSeverity,
  positionEq,
  type ITextDocument,
  type Range,
  type TextDocumentIdentifier,
  type ResourceIdentifier,
  fromLSPTextEdit,
  textDocumentId2ResourceModelId
} from './common'
import * as spxDocumentationItems from './document-base/spx'
import * as gopDocumentationItems from './document-base/gop'
import { isDocumentLinkForResourceReference } from './lsp/spxls/methods'
import { TextDocument, createTextDocument } from './text-document'
import { type Monaco } from './monaco'

// mock data for test
const allItems = Object.values({
  ...spxDocumentationItems,
  ...gopDocumentationItems
})

class ResourceReferencesProvider
  extends Emitter<{
    didChangeResourceReferences: []
  }>
  implements IResourceReferencesProvider
{
  constructor(private lspClient: SpxLSPClient) {
    super()
  }
  async provideResourceReferences(ctx: ResourceReferencesContext): Promise<ResourceReference[]> {
    const result = await this.lspClient.textDocumentDocumentLink({
      textDocument: ctx.textDocument.id
    })
    if (result == null) return []
    const rrs: ResourceReference[] = []
    for (const documentLink of result) {
      if (!isDocumentLinkForResourceReference(documentLink)) continue
      rrs.push({
        kind: documentLink.data.kind,
        range: fromLSPRange(documentLink.range),
        resource: { uri: documentLink.target }
      })
    }
    return rrs
  }
}

class DiagnosticsProvider
  extends Emitter<{
    didChangeDiagnostics: []
  }>
  implements IDiagnosticsProvider
{
  constructor(
    private runtime: Runtime,
    private lspClient: SpxLSPClient
  ) {
    super()
  }
  private adaptDiagnosticRange({ start, end }: Range, textDocument: ITextDocument) {
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
  async provideDiagnostics(ctx: DiagnosticsContext): Promise<Diagnostic[]> {
    // TODO: get diagnostics from runtime
    const diagnostics: Diagnostic[] = []
    const report = await this.lspClient.textDocumentDiagnostic({
      textDocument: ctx.textDocument.id
    })
    if (report.kind !== DocumentDiagnosticReportKind.Full) throw new Error(`Report kind ${report.kind} not suppoprted`)
    for (const item of report.items) {
      const severity = item.severity == null ? null : fromLSPSeverity(item.severity)
      if (severity === null) continue
      const range = this.adaptDiagnosticRange(fromLSPRange(item.range), ctx.textDocument)
      diagnostics.push({
        range,
        severity,
        message: item.message
      })
    }
    return diagnostics
  }
}

export class CodeEditor extends Disposable {
  private copilot: Copilot
  private documentBase: DocumentBase
  private lspClient: SpxLSPClient

  constructor(
    private project: Project,
    private runtime: Runtime,
    private monaco: Monaco
  ) {
    super()
    this.copilot = new Copilot()
    this.documentBase = new DocumentBase()
    this.lspClient = new SpxLSPClient(project)
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
    console.warn('TODO: format', id)
  }

  /** Update references in code for resource renaming, should be called before model name update */
  async updateResourceReferencesOnRename(resource: ResourceIdentifier, newName: string) {
    const workspaceEdit = await this.lspClient.workspaceExecuteCommandspxRenameResources({ resource, newName })
    if (workspaceEdit == null || workspaceEdit.changes == null) return
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      const textDocument = this.getTextDocument({ uri })
      textDocument?.pushEdits(edits.map(fromLSPTextEdit))
    }
  }

  private uis: ICodeEditorUI[] = []

  attachUI(ui: ICodeEditorUI) {
    this.uis.push(ui)
    ;(window as any).ui = ui // for debugging only
    const { copilot, documentBase, lspClient } = this

    ui.registerAPIReferenceProvider({
      async provideAPIReference(ctx, position) {
        const definitions = await lspClient.workspaceExecuteCommandSpxGetDefinitions({
          // TODO: support signal
          textDocument: ctx.textDocument.id,
          position: toLSPPosition(position)
        })
        ctx.signal.throwIfAborted()
        if (definitions == null) return []
        const defWithDocs = await Promise.all(definitions.map((def) => documentBase.getDocumentation(def)))
        return defWithDocs.filter((d) => d != null) as DefinitionDocumentationItem[]
      }
    })

    ui.registerCompletionProvider({
      async provideCompletion(ctx, position) {
        console.warn('TODO', ctx, position)
        await new Promise<void>((resolve) => setTimeout(resolve, 100))
        ctx.signal.throwIfAborted()
        return allItems.map((item) => ({
          label: item.definition
            .name!.split('.')
            .pop()!
            .replace(/^./, (c) => c.toLowerCase()),
          kind: item.kind,
          insertText: item.insertText,
          documentation: makeAdvancedMarkdownString(`
  <definition-overview-wrapper>${item.overview}</definition-overview-wrapper>
  <definition-detail def-id="${stringifyDefinitionId(item.definition)}"></definition-detail>
  `)
        }))
      }
    })

    ui.registerContextMenuProvider({
      async provideContextMenu({ textDocument }, position) {
        const word = textDocument.getWordAtPosition(position)
        if (word == null) return []
        const wordStart = { ...position, column: word.startColumn }
        const wordEnd = { ...position, column: word.endColumn }
        const explainTarget: ChatExplainTargetCodeSegment = {
          kind: ChatExplainKind.CodeSegment,
          codeSegment: {
            // TODO: use definition info from LS and explain definition instead of code-segment
            textDocument: textDocument.id,
            range: { start: wordStart, end: wordEnd },
            content: word.word
          }
        }
        return [
          {
            command: builtInCommandCopilotExplain,
            arguments: [explainTarget]
          }
        ]
      },
      async provideSelectionContextMenu({ textDocument }, selection) {
        const range = selection2Range(selection)
        const code = textDocument.getValueInRange(range)
        const explainTarget: ChatExplainTargetCodeSegment = {
          kind: ChatExplainKind.CodeSegment,
          codeSegment: {
            textDocument: textDocument.id,
            range,
            content: code
          }
        }
        const reviewTarget: Omit<ChatTopicReview, 'kind'> = {
          textDocument: textDocument.id,
          range,
          code
        }
        return [
          {
            command: builtInCommandCopilotExplain,
            arguments: [explainTarget]
          },
          {
            command: builtInCommandCopilotReview,
            arguments: [reviewTarget]
          }
        ]
      }
    })

    ui.registerCopilot(copilot)

    ui.registerDiagnosticsProvider(new DiagnosticsProvider(this.runtime, lspClient))

    ui.registerFormattingEditProvider({
      async provideDocumentFormattingEdits(ctx) {
        console.warn('TODO', ctx)
        return []
      }
    })

    ui.registerHoverProvider({
      async provideHover(ctx, position) {
        console.warn('TODO', ctx, position)
        await new Promise<void>((resolve) => setTimeout(resolve, 100))
        ctx.signal.throwIfAborted()
        const range = ctx.textDocument.getDefaultRange(position)
        const value = ctx.textDocument.getValueInRange(range)
        if (value.trim() === '') return null
        // TODO: get definition ID from LS
        const definitionID: DefinitionIdentifier = {
          package: 'github.com/goplus/spx',
          name: `Sprite.${value}`
        }
        const definition = await documentBase.getDocumentation(definitionID)
        const contents: DefinitionDocumentationString[] = []
        const actions: Action[] = []
        if (definition != null) {
          contents.push(
            makeAdvancedMarkdownString(`
  <definition-overview-wrapper>${definition.overview}</definition-overview-wrapper>
  <definition-detail def-id="${stringifyDefinitionId(definition.definition)}"></definition-detail>
  `)
          )
          actions.push({
            command: builtInCommandCopilotExplain,
            arguments: [
              {
                kind: ChatExplainKind.Definition,
                overview: definition.overview,
                definition: definition.definition
              }
            ]
          })
        }
        if (value === 'time') {
          contents.push(
            makeBasicMarkdownString(`<definition-overview-wrapper>var time int</definition-overview-wrapper>`)
          )
          actions.push({
            command: builtInCommandGoToDefinition,
            arguments: [
              {
                textDocument: {
                  uri: `file:///main.spx`
                },
                position: {
                  line: 2,
                  column: 2
                }
              }
            ]
          })
        }
        if (contents.length === 0) return null
        return {
          contents,
          actions
        }
      }
    })

    ui.registerResourceReferencesProvider(new ResourceReferencesProvider(lspClient))
    ui.registerDocumentBase(documentBase)
  }

  detachUI(ui: ICodeEditorUI) {
    const idx = this.uis.indexOf(ui)
    if (idx !== -1) this.uis.splice(idx, 1)
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
