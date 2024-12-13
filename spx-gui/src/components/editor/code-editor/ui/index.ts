import { uniqueId } from 'lodash'
import { ref, shallowRef, watchEffect } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import type { I18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { Sprite } from '@/models/sprite'
import { Sound } from '@/models/sound'
import { isWidget } from '@/models/widget'
import {
  type Command,
  type CommandInfo,
  type Range,
  type Position,
  type TextDocumentIdentifier,
  type Selection,
  type IDocumentBase,
  type Diagnostic,
  type Action,
  type TextDocumentPosition,
  type ResourceIdentifier
} from '../common'
import { HoverController, type IHoverProvider } from './hover'
import { CompletionController, type ICompletionProvider } from './completion'
import {
  ResourceReferenceController,
  type IResourceReferencesProvider,
  type InternalResourceReference
} from './resource-reference'
import { ContextMenuController, type IContextMenuProvider } from './context-menu'
import { DiagnosticsController, type IDiagnosticsProvider } from './diagnostics'
import { APIReferenceController, type IAPIReferenceProvider } from './api-reference'
import {
  CopilotController,
  type ICopilot,
  ChatTopicKind,
  type ChatTopicExplainTarget,
  type ChatTopicReview
} from './copilot'
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
  getCodeOwner,
  getResourceModel,
  supportGoTo
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
export const builtInCommandCopilotReview: Command<[target: Omit<ChatTopicReview, 'kind'>], void> = 'spx.copilot.review'
export const builtInCommandCopilotFixProblem: Command<
  [{ textDocument: TextDocumentIdentifier; problem: Diagnostic }],
  void
> = 'spx.copilot.fixProblem'
export const builtInCommandCopy: Command<[], void> = 'editor.action.copy'
export const builtInCommandCut: Command<[], void> = 'editor.action.cut'
export const builtInCommandPaste: Command<[], void> = 'editor.action.paste'
export const builtInCommandGoToDefinition: Command<[TextDocumentPosition], void> = 'spx.goToDefinition'
export const builtInCommandGoToResource: Command<[ResourceIdentifier], void> = 'spx.goToResource'
// export const builtInCommandRename: Command<[TextDocumentPosition], void> = 'spx.rename'
export const builtInCommandRenameResource: Command<[ResourceIdentifier], void> = 'spx.renameResource'
export const builtInCommandModifyResourceReference: Command<[InternalResourceReference], void> =
  'spx.modifyResourceReference'

export type InternalAction<A extends any[] = any, R = any> = {
  title: string
  command: Command<A, R>
  commandInfo: CommandInfo<A, R>
  arguments: A
}

export class CodeEditorUI extends Disposable implements ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void {
    this.hoverController.registerProvider(provider)
  }
  registerCompletionProvider(provider: ICompletionProvider): void {
    this.completionController.registerProvider(provider)
  }
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void {
    this.resourceReferenceController.registerProvider(provider)
  }
  registerContextMenuProvider(provider: IContextMenuProvider): void {
    this.contextMenuController.registerProvider(provider)
  }
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void {
    this.diagnosticsController.registerProvider(provider)
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

  private commands = new Map<Command<any, any>, CommandInfo<any, any>>()
  getCommandInfo<A extends any[], R>(command: Command<A, R>): CommandInfo<A, R> | null {
    return this.commands.get(command) ?? null
  }
  async executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R> {
    const info = this.getCommandInfo(command)
    if (info == null) throw new Error(`Command not found: ${command}`)
    return info.handler(...input)
  }
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void {
    this.commands.set(command, info)
  }

  resolveAction<A extends any[], R>(action: Action<A, R>): InternalAction<A, R> | null {
    const info = this.getCommandInfo(action.command)
    if (info == null) return null
    return {
      title: action.title ?? this.i18n.t(info.title),
      command: action.command,
      commandInfo: info,
      arguments: action.arguments
    }
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

  constructor(
    public project: Project,
    public i18n: I18n,
    private renameResourceHandler: (resource: ResourceIdentifier) => Promise<void>
  ) {
    super()
  }

  id = uniqueId('code-editor-ui-')
  apiReferenceController = new APIReferenceController(this)
  hoverController = new HoverController(this)
  completionController = new CompletionController(this)
  copilotController = new CopilotController(this)
  contextMenuController = new ContextMenuController(this)
  diagnosticsController = new DiagnosticsController(this)
  resourceReferenceController = new ResourceReferenceController(this)
  documentBase: IDocumentBase | null = null

  /** All opened text documents in current editor, by ID uri */
  private textDocuments = new Map<string, TextDocument>()
  /** The "main" (initially opened) text document ID */
  private mainTextDocumentIdRef = shallowRef<TextDocumentIdentifier | null>(null)
  /** Current active text document ID */
  private activeTextDocumentIdRef = shallowRef<TextDocumentIdentifier | null>(null)

  getTextDocument(id: TextDocumentIdentifier): TextDocument | null {
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
  private _editorEl: HTMLElement | null = null
  get editorEl() {
    if (this._editorEl == null) throw new Error('Editor element not initialized')
    return this._editorEl
  }

  private isCopilotActiveRef = ref(false)
  get isCopilotActive() {
    return this.isCopilotActiveRef.value
  }
  setIsCopilotActive(active: boolean) {
    this.isCopilotActiveRef.value = active
  }

  init(monaco: Monaco, editor: MonacoEditor, editorEl: HTMLElement) {
    this._monaco = monaco
    this._editor = editor
    this._editorEl = editorEl

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
      icon: 'explain', // TODO
      title: { en: 'Ask copilot', zh: '向 Copilot 提问' },
      handler: (problem) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.Inspire,
          problem
        })
      }
    })

    this.registerCommand(builtInCommandCopilotExplain, {
      icon: 'explain',
      title: { en: 'Explain', zh: '解释' },
      handler: (target) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.Explain,
          target
        })
      }
    })

    this.registerCommand(builtInCommandCopilotReview, {
      icon: 'explain', // TODO
      title: { en: 'Review', zh: '审查' },
      handler: (target) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.Review,
          ...target
        })
      }
    })

    this.registerCommand(builtInCommandCopilotFixProblem, {
      icon: 'fix',
      title: { en: 'Fix problem', zh: '修复问题' },
      handler: (params) => {
        this.copilotController.startChat({
          kind: ChatTopicKind.FixProblem,
          ...params
        })
      }
    })

    // Ideally we should use `editor.trigger(source, 'editor.action.xxx')` to implement copy/cut/paste,
    // while these actions are missing in the `editor.getSupportedActions()`, see details in https://github.com/microsoft/monaco-editor/issues/2598.
    // As a workaround, we use `document.execCommand` to implement these actions.
    this.registerCommand(builtInCommandCopy, {
      icon: 'explain', // TODO
      title: { en: 'Copy', zh: '复制' },
      handler: () => {
        editor.focus()
        document.execCommand('copy')
      }
    })
    this.registerCommand(builtInCommandCut, {
      icon: 'explain', // TODO
      title: { en: 'Cut', zh: '剪切' },
      handler: () => {
        editor.focus()
        document.execCommand('cut')
      }
    })
    this.registerCommand(builtInCommandPaste, {
      icon: 'explain', // TODO
      title: { en: 'Paste', zh: '粘贴' },
      handler: async () => {
        try {
          // This is slightly different from monaco's built-in paste behavior, for example, when pasting a "line".
          // TODO: keep consistent with monaco's built-in behavior
          const selection = editor.getSelection()
          if (selection == null) return
          const text = await navigator.clipboard.readText()
          editor.executeEdits('editor', [{ range: selection, text }])
          editor.focus()
        } catch (error) {
          editor.focus()
          document.execCommand('paste')
        }
      }
    })

    this.registerCommand(builtInCommandGoToDefinition, {
      icon: 'goto',
      title: { en: 'Go to definition', zh: '跳转到定义' },
      handler: async (params) => {
        const { textDocument, position } = params
        this.open(textDocument, position)
      }
    })

    this.registerCommand(builtInCommandGoToResource, {
      icon: 'goto',
      title: { en: 'View detail', zh: '查看详情' },
      handler: async (resource) => {
        const resourceModel = getResourceModel(this.project, resource)
        if (!supportGoTo(resourceModel)) throw new Error(`Go to resource (${resource.uri}) not supported`)
        if (resourceModel instanceof Sprite) return this.project.select({ type: 'sprite', id: resourceModel.id })
        if (resourceModel instanceof Sound) return this.project.select({ type: 'sound', id: resourceModel.id })
        if (isWidget(resourceModel)) {
          this.project.select({ type: 'stage' })
          this.project.stage.selectWidget(resourceModel.id)
        }
      }
    })

    this.registerCommand(builtInCommandModifyResourceReference, {
      icon: 'modify',
      title: { en: 'Modify', zh: '修改' },
      handler: (rr) => {
        this.resourceReferenceController.startModifying(rr.id)
      }
    })

    this.registerCommand(builtInCommandRenameResource, {
      icon: 'rename',
      title: { en: 'Rename', zh: '重命名' },
      handler: async (resource) => {
        await this.renameResourceHandler(resource)
      }
    })

    this.apiReferenceController.init()
    this.hoverController.init()
    this.completionController.init()
    this.copilotController.init()
    this.contextMenuController.init()
    this.diagnosticsController.init()
    this.resourceReferenceController.init()
  }

  dispose() {
    this.resourceReferenceController.dispose()
    this.diagnosticsController.dispose()
    this.contextMenuController.dispose()
    this.copilotController.dispose()
    this.completionController.dispose()
    this.hoverController.dispose()
    this.apiReferenceController.dispose()
    super.dispose()
  }
}
