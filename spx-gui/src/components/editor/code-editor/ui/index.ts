import { uniqueId } from 'lodash'
import { ref, shallowRef, watchEffect } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import type { Project } from '@/models/project'
import {
  type Command,
  type CommandInfo,
  type Range,
  type Position,
  type TextDocumentIdentifier,
  type ITextDocument,
  type Selection,
  type IDocumentBase
} from '../common'
import { HoverController, type IHoverProvider } from './hover'
import { CompletionController, type ICompletionProvider } from './completion'
import type { IResourceReferencesProvider } from './resource-reference'
import { ContextMenuController, type IContextMenuProvider } from './context-menu'
import type { IDiagnosticsProvider } from './diagnostics'
import { APIReferenceController, type IAPIReferenceProvider } from './api-reference'
import { CopilotController, type ICopilot, ChatTopicKind, type ChatTopicExplainTarget } from './copilot'
import type { IFormattingEditProvider } from './formatting'
import {
  type Monaco,
  type MonacoEditor,
  getSelectedCodeOwner,
  type ICodeOwner,
  fromMonacoPosition,
  toMonacoRange,
  fromMonacoSelection,
  isRangeEmpty,
  toMonacoPosition,
  getCodeOwner
} from './common'
import { TextDocument } from './text-document'

export * from './hover'
export * from './completion'
export * from './resource-reference'
export * from './context-menu'
export * from './diagnostics'
export * from './api-reference'
export * from './copilot'
export * from './formatting'

export { default as CodeEditorUIComp } from './CodeEditorUI.vue'

export interface ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void
  registerCompletionProvider(provider: ICompletionProvider): void
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void
  registerContextMenuProvider(provider: IContextMenuProvider): void
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void
  registerCopilot(copilot: ICopilot): void
  registerFormattingEditProvider(provider: IFormattingEditProvider): void
  registerDocumentBase(documentBase: IDocumentBase): void

  /** Execute a command */
  executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R>
  /** Register a command with given name & handler */
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void

  /** Open a text document in the editor. */
  open(textDocument: TextDocumentIdentifier): void
  /** Open a text document in the editor,and scroll to given position */
  open(textDocument: TextDocumentIdentifier, position: Position): void
  /** Open a text document in the editor, and select the given range */
  open(textDocument: TextDocumentIdentifier, range: Range): void
}

export const builtInCommandCopilotInspire: Command<[problem: string], void> = 'spx.copilot.inspire'
export const builtInCommandCopilotExplain: Command<[target: ChatTopicExplainTarget], void> = 'spx.copilot.explain'
// const builtInCommandGoToDefinition: Command<[TextDocumentPosition], void> = 'spx.goToDefinition'
// const builtInCommandRename: Command<[TextDocumentPosition], void> = 'spx.rename'
// const builtInCommandResourceReferenceModify: Command<[TextDocumentRange, ResourceIdentifier], void> = 'spx.resourceReference.modify'

export class CodeEditorUI extends Disposable implements ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void {
    this.hoverController.registerProvider(provider)
  }
  registerCompletionProvider(provider: ICompletionProvider): void {
    this.completionController.registerProvider(provider)
  }
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void {
    console.warn('TODO', provider)
  }
  registerContextMenuProvider(provider: IContextMenuProvider): void {
    console.warn('TODO', provider)
  }
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void {
    console.warn('TODO', provider)
  }
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void {
    this.apiReferenceController.registerProvider(provider)
  }
  registerCopilot(copilot: ICopilot): void {
    this.copilotController.registerCopilot(copilot)
  }
  registerFormattingEditProvider(provider: IFormattingEditProvider): void {
    console.warn('TODO', provider)
  }
  registerDocumentBase(documentBase: IDocumentBase): void {
    this.documentBase = documentBase
  }

  private commandHandlers = new Map<Command<any, any>, CommandInfo<any, any>>()
  async executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R> {
    const info = this.commandHandlers.get(command)
    if (info == null) throw new Error(`Command not found: ${command}`)
    return info.handler(...input)
  }
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void {
    this.commandHandlers.set(command, info)
  }

  open(textDocument: TextDocumentIdentifier): void
  open(textDocument: TextDocumentIdentifier, position: Position): void
  open(textDocument: TextDocumentIdentifier, range: Range): void
  open(textDocument: TextDocumentIdentifier, positionOrRange?: Position | Range): void {
    this.openTextDocument(textDocument)
    if (positionOrRange == null) return
    if ('line' in positionOrRange) {
      this.editor.setPosition(toMonacoPosition(positionOrRange))
    } else {
      this.editor.setSelection(toMonacoRange(positionOrRange))
    }
    this.editor.focus()
  }

  constructor(private project: Project) {
    super()
  }

  id = uniqueId('code-editor-ui-')
  apiReferenceController = new APIReferenceController(this)
  hoverController = new HoverController(this)
  completionController = new CompletionController(this)
  copilotController = new CopilotController(this)
  contextMenuController = new ContextMenuController(this)
  documentBase: IDocumentBase | null = null

  /** All opened text documents in current editor, by ID uri */
  private textDocuments = new Map<string, TextDocument>()
  /** The "main" (initially opened) text document ID */
  private mainTextDocumentIdRef = shallowRef<TextDocumentIdentifier | null>(null)
  /** Current active text document ID */
  private activeTextDocumentIdRef = shallowRef<TextDocumentIdentifier | null>(null)

  getTextDocument(id: TextDocumentIdentifier): ITextDocument | null {
    return this.textDocuments.get(id.uri) ?? null
  }

  private addTextDocument(textDocument: TextDocument) {
    this.textDocuments.set(textDocument.id.uri, textDocument)
    this.addDisposable(textDocument)
  }

  private setActiveTextDocument(activeId: TextDocumentIdentifier | null) {
    if (activeId == null) {
      this.activeTextDocumentIdRef.value = null
      this.editor.setModel(null)
      return
    }
    const textDocument = this.textDocuments.get(activeId.uri)
    if (textDocument == null) throw new Error(`Text document not exist: ${activeId.uri}`)
    this.activeTextDocumentIdRef.value = activeId
    this.editor.setModel(textDocument.monacoTextModel)
  }

  /** The "main" (initially opened) text document */
  get mainTextDocument() {
    if (this.mainTextDocumentIdRef.value == null) return null
    return this.getTextDocument(this.mainTextDocumentIdRef.value) ?? null
  }
  /** Current active text document */
  get activeTextDocument() {
    if (this.activeTextDocumentIdRef.value == null) return null
    return this.getTextDocument(this.activeTextDocumentIdRef.value)
  }

  private initMainTextDocument(mainCodeOwner: ICodeOwner | null) {
    this.textDocuments.clear()
    if (mainCodeOwner == null) {
      this.mainTextDocumentIdRef.value = null
      this.setActiveTextDocument(null)
    } else {
      const mainTextDocument = new TextDocument(mainCodeOwner, this.monaco)
      this.mainTextDocumentIdRef.value = mainTextDocument.id
      this.addTextDocument(mainTextDocument)
      this.setActiveTextDocument(mainTextDocument.id)
    }
  }

  private openTextDocument(id: TextDocumentIdentifier) {
    if (this.getTextDocument(id) == null) {
      const codeOwner = getCodeOwner(this.project, id)
      if (codeOwner == null) {
        console.warn(`Code file not exist for ${id.uri}`)
        return
      }
      const textDocument = new TextDocument(codeOwner, this.monaco)
      this.addTextDocument(textDocument)
    }
    this.setActiveTextDocument(id)
  }

  async insertSnippet(snippet: string, range: Range) {
    const editor = this.editor
    // `executeEdits` does not support snippet, so we have to split the insertion into two steps:
    // 1. remove the range with `executeEdits`
    // 2. insert the snippet with `snippetController2`
    if (!isRangeEmpty(range)) {
      const removing = { range: toMonacoRange(range), text: '' }
      editor.executeEdits('snippet', [removing])
      await timeout(0) // NOTE: the timeout is necessary, or the cursor position will be wrong after snippet inserted
    }
    // it's strange but it works, see details in https://github.com/Microsoft/monaco-editor/issues/342
    const contribution = editor.getContribution('snippetController2')
    if (contribution == null) throw new Error('Snippet contribution not found')
    ;(contribution as any).insert(snippet)
  }

  private cursorPositionRef = shallowRef<Position | null>(null)
  /** Cursor position (in current active text document) */
  get cursorPosition() {
    return this.cursorPositionRef.value
  }

  private selectionRef = shallowRef<Selection | null>(null)
  /** Selection (in current active text document) */
  get selection() {
    return this.selectionRef.value
  }

  private _monaco: Monaco | null = null
  get monaco() {
    if (this._monaco == null) throw new Error('Monaco not initialized')
    return this._monaco
  }
  private _editor: MonacoEditor | null = null
  get editor() {
    if (this._editor == null) throw new Error('Editor not initialized')
    return this._editor
  }

  private isCopilotActiveRef = ref(false)
  get isCopilotActive() {
    return this.isCopilotActiveRef.value
  }
  setIsCopilotActive(active: boolean) {
    this.isCopilotActiveRef.value = active
  }

  init(monaco: Monaco, editor: MonacoEditor) {
    this._monaco = monaco
    this._editor = editor

    this.addDisposer(
      watchEffect(() => {
        this.initMainTextDocument(getSelectedCodeOwner(this.project))
      })
    )

    this.addDisposable(
      editor.onDidChangeCursorPosition((e) => {
        this.cursorPositionRef.value = fromMonacoPosition(e.position)
      })
    )

    this.addDisposable(
      editor.onDidChangeCursorSelection((e) => {
        this.selectionRef.value = fromMonacoSelection(e.selection)
      })
    )

    this.registerCommand(builtInCommandCopilotInspire, {
      icon: 'TODO',
      title: {
        en: 'Ask copilot',
        zh: '向 Copilot 提问'
      },
      handler: (problem) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.Inspire,
          problem
        })
      }
    })

    this.registerCommand(builtInCommandCopilotExplain, {
      icon: 'TODO',
      title: {
        en: 'Explain',
        zh: '解释'
      },
      handler: (target) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.Explain,
          target
        })
      }
    })

    this.apiReferenceController.init()
    this.hoverController.init()
    this.completionController.init()
    this.copilotController.init()
    this.contextMenuController.init()
  }

  dispose() {
    this.contextMenuController.dispose()
    this.copilotController.dispose()
    this.completionController.dispose()
    this.hoverController.dispose()
    this.apiReferenceController.dispose()
    super.dispose()
  }
}
