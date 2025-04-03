import { uniqueId } from 'lodash'
import { ref, shallowReactive, shallowRef } from 'vue'
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
  type ResourceIdentifier,
  getResourceModel,
  type TextDocumentRange,
  isRangeEmpty,
  textDocumentIdEq,
  selection2Range
} from '../common'
import { TextDocument } from '../text-document'
import type { Monaco, MonacoEditor, monaco } from '../monaco'
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
import { fromMonacoPosition, toMonacoRange, fromMonacoSelection, toMonacoPosition, supportGoTo } from './common'
import { InputHelperController } from './input-helper'

export * from './hover'
export * from './completion'
export * from './resource-reference'
export * from './context-menu'
export * from './diagnostics'
export * from './api-reference'
export * from './copilot'

export interface ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void
  registerCompletionProvider(provider: ICompletionProvider): void
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void
  registerContextMenuProvider(provider: IContextMenuProvider): void
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void
  registerCopilot(copilot: ICopilot): void
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

  dispose(): void
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
export const builtInCommandGoToDefinition: Command<[TextDocumentPosition | TextDocumentRange], void> =
  'spx.goToDefinition'
export const builtInCommandGoToResource: Command<[ResourceIdentifier], void> = 'spx.goToResource'
export const builtInCommandRename: Command<[TextDocumentPosition & TextDocumentRange], void> = 'spx.rename'
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
    this.setActiveTextDocument(textDocument)
    if (positionOrRange == null) return
    if ('line' in positionOrRange) {
      const mPos = toMonacoPosition(positionOrRange)
      this.editor.setPosition(mPos)
      this.editor.revealPositionNearTop(mPos)
    } else {
      const mRange = toMonacoRange(positionOrRange)
      this.editor.setSelection(mRange)
      this.editor.revealRangeNearTopIfOutsideViewport(mRange)
    }
    this.editor.focus()
  }

  constructor(
    private mainTextDocumentId: TextDocumentIdentifier,
    public project: Project,
    public i18n: I18n,
    public monaco: Monaco,
    private getTextDocument: (id: TextDocumentIdentifier) => TextDocument | null,
    private renameHandler: (textDocument: TextDocumentIdentifier, position: Position, range: Range) => Promise<void>,
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
  inputHelperController = new InputHelperController(this)
  documentBase: IDocumentBase | null = null

  /** Temporary text document IDs */
  private tempTextDocumentIds = shallowReactive<TextDocumentIdentifier[]>([])

  /** Temporary text documents */
  get tempTextDocuments() {
    return this.tempTextDocumentIds.map((id) => {
      const doc = this.getTextDocument(id)
      if (doc == null) throw new Error(`Text document not found: ${id.uri}`)
      return doc
    })
  }

  closeTempTextDocuments() {
    this.setActiveTextDocument(this.mainTextDocumentId)
    this.tempTextDocumentIds.splice(0)
  }

  /** Current active text document ID */
  private activeTextDocumentIdRef = shallowRef<TextDocumentIdentifier | null>(null)

  /** Current active text document */
  get activeTextDocument() {
    if (this.activeTextDocumentIdRef.value == null) return null
    return this.getTextDocument(this.activeTextDocumentIdRef.value)
  }

  private viewStateMap = new WeakMap<TextDocument, monaco.editor.ICodeEditorViewState | null>()

  private setActiveTextDocument(activeId: TextDocumentIdentifier | null) {
    const textDocument = activeId != null ? this.getTextDocument(activeId) : null
    if (textDocument == null) {
      this.activeTextDocumentIdRef.value = null
      this.editor.setModel(null)
      return
    }
    if (
      !textDocumentIdEq(textDocument.id, this.mainTextDocumentId) &&
      !this.tempTextDocumentIds.some((id) => textDocumentIdEq(id, textDocument.id))
    ) {
      this.tempTextDocumentIds.push(textDocument.id)
    }
    if (this.activeTextDocument != null) this.viewStateMap.set(this.activeTextDocument, this.editor.saveViewState())
    this.activeTextDocumentIdRef.value = textDocument.id
    this.editor.setModel(textDocument.monacoTextModel)
    const viewState = this.viewStateMap.get(textDocument)
    if (viewState != null) this.editor.restoreViewState(viewState)
  }

  /** The "main" (initially opened) text document */
  get mainTextDocument() {
    return this.getTextDocument(this.mainTextDocumentId)
  }

  private getSelectionRange() {
    const pos = { line: 1, column: 1 }
    let range = { start: pos, end: pos }
    if (this.selection != null) {
      range = selection2Range(this.selection)
    }
    return range
  }

  // TODO: Optimize inserting logic with inline context. https://github.com/goplus/builder/issues/1258

  async insertText(text: string, range: Range = this.getSelectionRange()) {
    this.activeTextDocument?.pushEdits([
      {
        range,
        newText: text
      }
    ])
    this.editor.focus()
  }

  async insertSnippet(snippet: string, range: Range = this.getSelectionRange()) {
    const editor = this.editor
    // `executeEdits` does not support snippet, so we have to split the insertion into two steps:
    // 1. remove the range with `executeEdits`
    // 2. insert the snippet with `snippetController2`
    if (!isRangeEmpty(range)) {
      const removing = { range: toMonacoRange(range), text: '' }
      editor.executeEdits('insertSnippet', [removing])
      await timeout(0) // NOTE: the timeout is necessary, or the cursor position will be wrong after snippet inserted
    }
    // It's weird but works, see details in https://github.com/Microsoft/monaco-editor/issues/342
    // While it prevents us to wrap a history action around the snippet insertion. See details in `TextDocument.withChangeKindProgram`
    // TODO: Use better way to insert snippet
    const contribution = editor.getContribution('snippetController2')
    if (contribution == null) throw new Error('Snippet contribution not found')
    ;(contribution as any).insert(snippet)
    this.editor.focus()
  }

  private async insertInlineContent(type: 'text' | 'snippet', content: string, range: Range) {
    const textDocument = this.activeTextDocument
    if (textDocument == null) return

    const insert = async (cnt: string, rg: Range) => {
      if (type === 'text') await this.insertText(cnt, rg)
      else await this.insertSnippet(cnt, rg)
    }

    if (!isRangeEmpty(range)) return insert(content, range)

    const pos = range.start
    const lineCnt = textDocument.getLineContent(pos.line)
    if (isEmptyText(lineCnt)) return insert(content, range)

    const word = textDocument.getWordAtPosition(pos)
    if (word == null) return insert(content, range)

    const isPosInWord = pos.column >= word.startColumn && pos.column <= word.endColumn
    if (isPosInWord) {
      const wordEndPos = { line: pos.line, column: word.endColumn }
      this.editor.setPosition(toMonacoPosition(wordEndPos))
      return insert(' ' + content, { start: wordEndPos, end: wordEndPos })
    }

    return insert(content, range)
  }

  private async insertBlockContent(type: 'text' | 'snippet', content: string, range: Range) {
    const textDocument = this.activeTextDocument
    if (textDocument == null) return

    const insert = async (cnt: string, rg: Range) => {
      // Ensure trailing newline if the insertion occurs at the end of the file
      const currentContent = textDocument.getValue()
      const insertionEndOffset = textDocument.getOffsetAt(rg.end)
      if (insertionEndOffset === currentContent.length && !cnt.endsWith('\n')) cnt += '\n'

      if (type === 'snippet') {
        await this.insertSnippet(cnt, rg)
        return
      }

      await this.insertText(cnt, rg)

      // Properly indent the inserted content for type `text`:
      // 1. Select inserted content
      const cursorPos = this.editor.getPosition()
      if (cursorPos == null) return
      this.editor.setSelection(toMonacoRange({ start: rg.start, end: fromMonacoPosition(cursorPos) }))
      // 2. Indent selected content
      this.editor.trigger('insertBlockContent', 'editor.action.reindentselectedlines', null)
      // 3. Clear selection, move cursor to end of the selection
      const selection = this.editor.getSelection()
      if (selection == null) return
      this.editor.setSelection({
        startLineNumber: selection.endLineNumber,
        startColumn: selection.endColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      })
    }

    const pos = range.end
    const lineCnt = textDocument.getLineContent(pos.line)
    if (isEmptyText(lineCnt)) return insert(content, range)

    const lineStartPos = { line: pos.line, column: 1 }
    const lineCntBeforePos = textDocument.getValueInRange({ start: lineStartPos, end: pos })
    const isPosAtLineStart = isEmptyText(lineCntBeforePos)
    if (isPosAtLineStart) {
      if (!content.endsWith('\n')) content = content + '\n'
      return insert(content, range)
    }

    const lineEndPos = { line: pos.line, column: lineCnt.length + 1 }
    this.editor.setPosition(toMonacoPosition(lineEndPos))
    content = '\n' + content.replace(/\n$/, '')
    return insert(content, { start: lineEndPos, end: lineEndPos })
  }

  async insertInlineText(text: string, range: Range = this.getSelectionRange()) {
    return this.insertInlineContent('text', text, range)
  }

  async insertInlineSnippet(snippet: string, range: Range = this.getSelectionRange()) {
    return this.insertInlineContent('snippet', snippet, range)
  }

  async insertBlockText(text: string, range: Range = this.getSelectionRange()) {
    return this.insertBlockContent('text', text, range)
  }

  async insertBlockSnippet(snippet: string, range: Range = this.getSelectionRange()) {
    return this.insertBlockContent('snippet', snippet, range)
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

  init(editor: MonacoEditor) {
    this._editor = editor

    this.setActiveTextDocument(this.mainTextDocumentId)

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
      icon: 'copilot',
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
      icon: 'explain', // TODO: Add specific icon for review when it is needed
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
      icon: 'copy',
      title: { en: 'Copy', zh: '复制' },
      handler: () => {
        editor.focus()
        document.execCommand('copy')
      }
    })
    this.registerCommand(builtInCommandCut, {
      icon: 'copy', // TODO: Add specific icon for cut when it is needed
      title: { en: 'Cut', zh: '剪切' },
      handler: () => {
        editor.focus()
        document.execCommand('cut')
      }
    })
    this.registerCommand(builtInCommandPaste, {
      icon: 'copy', // TODO: Add specific icon for paste when it is needed
      title: { en: 'Paste', zh: '粘贴' },
      handler: async () => {
        try {
          // This is slightly different from monaco's built-in paste behavior, for example, when pasting a "line".
          // TODO: keep consistent with monaco's built-in behavior
          const selection = editor.getSelection()
          if (selection == null) return
          const text = await navigator.clipboard.readText()
          editor.executeEdits('paste', [{ range: selection, text }])
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
        if ('position' in params) this.open(params.textDocument, params.position)
        else this.open(params.textDocument, params.range)
      }
    })

    this.registerCommand(builtInCommandGoToResource, {
      icon: 'goto',
      title: { en: 'View detail', zh: '查看详情' },
      handler: async (resource) => {
        const resourceModel = getResourceModel(this.project, resource)
        if (resourceModel == null) throw new Error(`Resource not found: ${resource.uri}`)
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

    this.registerCommand(builtInCommandRename, {
      icon: 'rename',
      title: { en: 'Rename', zh: '重命名' },
      handler: async (params) => {
        const { textDocument, position, range } = params
        await this.renameHandler(textDocument, position, range)
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
    this.inputHelperController.init()
  }

  dispose() {
    this.inputHelperController.dispose()
    this.resourceReferenceController.dispose()
    this.diagnosticsController.dispose()
    this.contextMenuController.dispose()
    this.copilotController.dispose()
    this.completionController.dispose()
    this.hoverController.dispose()
    this.apiReferenceController.dispose()
    this._editor?.setModel(null)
    super.dispose()
  }
}

function isEmptyText(s: string) {
  return /^\s*$/.test(s)
}
