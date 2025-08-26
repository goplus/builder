import { uniqueId } from 'lodash'
import { ref, shallowReactive, shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import type { I18n, LocaleMessage } from '@/utils/i18n'
import { createCodeEditorOperationName, defineIdleTransaction } from '@/utils/tracing'
import type { Project } from '@/models/project'
import type { Copilot } from '@/components/copilot/copilot'
import type { EditorState } from '../../editor-state'
import {
  type Command,
  type CommandInfo,
  type Range,
  type Position,
  type TextDocumentIdentifier,
  type Selection,
  type IDocumentBase,
  type Action,
  type TextDocumentPosition,
  type ResourceIdentifier,
  getResourceModel,
  type TextDocumentRange,
  isRangeEmpty,
  textDocumentIdEq,
  selection2Range,
  type DefinitionDocumentationItem,
  isBlockDefinitionKind
} from '../common'
import { TextDocument } from '../text-document'
import type { Monaco, MonacoEditor, monaco } from '../monaco'
import { HoverController, type IHoverProvider } from './hover'
import { CompletionController, type ICompletionProvider } from './completion'
import { ResourceReferenceController, type IResourceReferencesProvider } from './resource-reference'
import { ContextMenuController, type IContextMenuProvider } from './context-menu'
import { DiagnosticsController, type IDiagnosticsProvider } from './diagnostics'
import { APIReferenceController, type IAPIReferenceProvider } from './api-reference'
import { fromMonacoPosition, toMonacoRange, fromMonacoSelection, toMonacoPosition } from './common'
import { InputHelperController, type IInputHelperProvider, type InternalInputSlot } from './input-helper'
import { InlayHintController, type IInlayHintProvider } from './inlay-hint'
import { DropIndicatorController } from './drop-indicator'
import { SnippetParser } from './snippet'
import {
  CopilotExplainKind,
  makeCodeBlock,
  makeCodeLinkWithRange,
  type CopilotExplainTarget,
  type CopilotFixProblemTarget,
  type CopilotReviewTarget
} from './copilot'

export * from './hover'
export * from './completion'
export * from './resource-reference'
export * from './context-menu'
export * from './diagnostics'
export * from './api-reference'
export * from './input-helper'
export * from './inlay-hint'
export * from './copilot'
export * from './drop-indicator'

export interface ICodeEditorUI {
  registerHoverProvider(provider: IHoverProvider): void
  registerCompletionProvider(provider: ICompletionProvider): void
  registerResourceReferencesProvider(provider: IResourceReferencesProvider): void
  registerInputHelperProvider(provider: IInputHelperProvider): void
  registerInlayHintProvider(provider: IInlayHintProvider): void
  registerContextMenuProvider(provider: IContextMenuProvider): void
  registerDiagnosticsProvider(provider: IDiagnosticsProvider): void
  registerAPIReferenceProvider(provider: IAPIReferenceProvider): void
  registerDocumentBase(documentBase: IDocumentBase): void

  /** Execute a command */
  executeCommand<A extends any[], R>(command: Command<A, R>, ...input: A): Promise<R>
  /** Register a command with given name & handler */
  registerCommand<A extends any[], R>(command: Command<A, R>, info: CommandInfo<A, R>): void

  /** Current active text document */
  activeTextDocument: TextDocument | null
  /** Cursor position (in current active text document) */
  cursorPosition: Position | null
  /** Current selection (in current active text document) */
  selection: Selection | null
  /** Open a text document in the editor. */
  open(textDocument: TextDocumentIdentifier): void
  /** Open a text document in the editor,and scroll to given position */
  open(textDocument: TextDocumentIdentifier, position: Position): void
  /** Open a text document in the editor, and select the given range */
  open(textDocument: TextDocumentIdentifier, range: Range): void

  insertBlockText(text: string, range?: Range): Promise<void>

  dispose(): void
}

export const builtInCommandCopilotInspire: Command<[problem: string], void> = 'spx.copilot.inspire'
export const builtInCommandCopilotExplain: Command<[target: CopilotExplainTarget], void> = 'spx.copilot.explain'
export const builtInCommandCopilotReview: Command<[target: CopilotReviewTarget], void> = 'spx.copilot.review'
export const builtInCommandCopilotFixProblem: Command<[target: CopilotFixProblemTarget], void> =
  'spx.copilot.fixProblem'
export const builtInCommandCopy: Command<[], void> = 'editor.action.copy'
export const builtInCommandCut: Command<[], void> = 'editor.action.cut'
export const builtInCommandPaste: Command<[], void> = 'editor.action.paste'
export const builtInCommandGoToDefinition: Command<[TextDocumentPosition | TextDocumentRange], void> =
  'spx.goToDefinition'
export const builtInCommandGoToResource: Command<[ResourceIdentifier], void> = 'spx.goToResource'
export const builtInCommandRename: Command<[TextDocumentPosition & TextDocumentRange], void> = 'spx.rename'
export const builtInCommandRenameResource: Command<[ResourceIdentifier], void> = 'spx.renameResource'
export const builtInCommandInvokeInputHelper: Command<[InternalInputSlot], void> = 'spx.invokeInputHelper'

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
  registerInputHelperProvider(provider: IInputHelperProvider): void {
    this.inputHelperController.registerProvider(provider)
  }
  registerInlayHintProvider(provider: IInlayHintProvider): void {
    this.inlayHintController.registerProvider(provider)
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
    private editorState: EditorState,
    public i18n: I18n,
    public monaco: Monaco,
    private copilot: Copilot,
    private getTextDocument: (id: TextDocumentIdentifier) => TextDocument | null,
    private renameHandler: (textDocument: TextDocumentIdentifier, position: Position, range: Range) => Promise<void>,
    private renameResourceHandler: (resource: ResourceIdentifier) => Promise<void>
  ) {
    super()
    this.snippetParser = new SnippetParser(project, this)
  }

  id = uniqueId('code-editor-ui-')
  apiReferenceController = new APIReferenceController(this)
  hoverController = new HoverController(this)
  completionController = new CompletionController(this)
  contextMenuController = new ContextMenuController(this)
  diagnosticsController = new DiagnosticsController(this)
  resourceReferenceController = new ResourceReferenceController(this)
  inputHelperController = new InputHelperController(this)
  inlayHintController = new InlayHintController(this)
  dropIndicatorController = new DropIndicatorController(this)
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
    this.tempTextDocumentIds.splice(0)
    if (!this.isDisposed) this.setActiveTextDocument(this.mainTextDocumentId)
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

  /**
   * Insert text at given range (defaults to current selection).
   * Cursor will be moved to the end of the inserted text.
   */
  async insertText(text: string, range: Range = this.getSelectionRange()) {
    this.activeTextDocument?.pushEdits([
      {
        range,
        newText: text
      }
    ])

    // After inserting text, we need to move the cursor to the end of the inserted text.
    // This is supposed to be done by Monaco editor if we calling `pushEditOperations` with proper cursor-state-computer in `TextDocument.pushEdits`.
    // While the cursor-state-computer is ignored, which is a bug. See details in https://github.com/microsoft/monaco-editor/issues/3893
    // TODO: Remove this workaround when the bug is fixed in Monaco editor.
    const insertionStart = range.start
    const insertedLines = text.split(/\r?\n/)
    let insertionEnd = insertionStart
    if (insertedLines.length > 1) {
      insertionEnd = {
        line: insertionStart.line + insertedLines.length - 1,
        column: insertedLines[insertedLines.length - 1].length + 1
      }
    } else {
      insertionEnd = {
        line: insertionStart.line,
        column: insertionStart.column + insertedLines[0].length
      }
    }
    this.editor.setPosition(toMonacoPosition(insertionEnd))

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
    ;(contribution as any).insert(snippet) // About `contribution.insert`: https://github.com/microsoft/vscode/blob/942d11fff1a3a4f0faa918b59803f699ec61b9b6/src/vs/editor/contrib/snippet/browser/snippetController2.ts#L104
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

  /** The newly inserted line number, starting from 1 */
  private newlyInsertedLineRef = shallowRef<number | null>(null)

  /** Check if the given position is in the newly inserted range */
  isNewlyInserted(position: Position) {
    const line = this.newlyInsertedLineRef.value
    if (line == null) return false
    return position.line === line
  }

  private async insertBlockContent(type: 'text' | 'snippet', content: string, range: Range) {
    const textDocument = this.activeTextDocument
    if (textDocument == null) return

    let insertAtLine = range.start.line

    const insert = async (cnt: string, rg: Range) => {
      // Ensure trailing newline if the insertion occurs at the end of the file
      const currentContent = textDocument.getValue()
      const insertionEndOffset = textDocument.getOffsetAt(rg.end)
      if (insertionEndOffset === currentContent.length && !cnt.endsWith('\n')) cnt += '\n'

      if (type === 'snippet') {
        await this.insertSnippet(cnt, rg)
        this.newlyInsertedLineRef.value = insertAtLine
        return
      }

      await this.insertText(cnt, rg)

      // Properly indent the inserted content for type `text`:
      // 1. Select inserted content
      const cursorPos = this.editor.getPosition()
      if (cursorPos == null) return
      const insertedRange: Range = { start: rg.start, end: fromMonacoPosition(cursorPos) }
      this.editor.setSelection(toMonacoRange(insertedRange))
      // 2. Indent selected content
      this.editor.trigger('insertBlockContent', 'editor.action.reindentselectedlines', null)
      // 3. Clear selection, move cursor to end of the selection
      const selection = this.editor.getSelection()
      if (selection != null) {
        this.editor.setSelection({
          startLineNumber: selection.endLineNumber,
          startColumn: selection.endColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        })
      }

      // Selection change causes cursor position change, which clears newlyInsertedLine unintentionally.
      // Add a timeout to avoid that. TODO: more reliable way to handle this.
      setTimeout(() => {
        this.newlyInsertedLineRef.value = insertAtLine
      }, 50)
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
    const lineCntAfterPos = textDocument.getValueInRange({ start: pos, end: lineEndPos })

    this.editor.setPosition(toMonacoPosition(lineEndPos))

    const precededByOpenBrace = isPrecededByOpenBrace(lineCntBeforePos)
    const followedByCloseBrace = isFollowedByCloseBrace(lineCntAfterPos)
    if (precededByOpenBrace || followedByCloseBrace) {
      if (precededByOpenBrace && !content.startsWith('\n')) {
        insertAtLine += 1
        content = '\n' + content
      }
      if (followedByCloseBrace && !content.endsWith('\n')) content = content + '\n'
      return insert(content, range)
    }

    insertAtLine += 1
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

  async insertDefinition(ddi: DefinitionDocumentationItem, range: Range = this.getSelectionRange()) {
    const parsed = this.parseSnippet(ddi.insertSnippet)
    // Now we have feature InputHelper for APIReferenceItem insertion.
    // The "TabStop / Placeholder" of snippet is not helpful and introduces confusion,
    // so we transform snippet to text and insert it directly.
    const text = parsed.toString()
    if (isBlockDefinitionKind(ddi.kind)) this.insertBlockText(text, range)
    else this.insertInlineText(text, range)
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

  private snippetParser: SnippetParser

  /** Parse given snippet string & resolve Builder built-in variables */
  parseSnippet(snippet: string) {
    return this.snippetParser.parse(snippet)
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
        this.copilot.addUserMessage(problem, {
          title: { en: 'Ask copilot', zh: '向 Copilot 提问' },
          description: '',
          reactToEvents: false
        })
      }
    })

    this.registerCommand(builtInCommandCopilotExplain, {
      icon: 'explain',
      title: { en: 'Explain', zh: '解释' },
      handler: (target) => {
        let message: LocaleMessage
        switch (target.kind) {
          case CopilotExplainKind.CodeSegment: {
            const { textDocument, range, content } = target.codeSegment
            const codeLink = makeCodeLinkWithRange(textDocument, range)
            const codeBlock = makeCodeBlock(content)
            message = {
              en: `Explain code ${codeLink}:\n\n${codeBlock}`,
              zh: `解释代码 ${codeLink}：\n\n${codeBlock}`
            }
            break
          }
          case CopilotExplainKind.SymbolWithDefinition: {
            const { textDocument, range, symbol } = target
            const codeLink = makeCodeLinkWithRange(textDocument, range, symbol)
            message = {
              en: `Explain ${codeLink}`,
              zh: `解释 ${codeLink}`
            }
            break
          }
          case CopilotExplainKind.Definition:
            message = {
              en: `Explain API \`${target.overview}\``,
              zh: `解释 API \`${target.overview}\``
            }
            break
        }
        this.copilot.addUserMessage(this.i18n.t(message), {
          title: { en: 'Explain', zh: '解释' },
          description: '',
          reactToEvents: false
        })
      }
    })

    this.registerCommand(builtInCommandCopilotReview, {
      icon: 'explain', // TODO: Add specific icon for review when it is needed
      title: { en: 'Review', zh: '审查' },
      handler: ({ textDocument, range, code }) => {
        const codeLink = makeCodeLinkWithRange(textDocument, range)
        const codeBlock = makeCodeBlock(code)
        const message = this.i18n.t({
          en: `Review code ${codeLink}:\n\n${codeBlock}`,
          zh: `审查代码 ${codeLink}：\n\n${codeBlock}`
        })
        this.copilot.addUserMessage(message, {
          title: { en: 'Review', zh: '审查' },
          description: '',
          reactToEvents: false
        })
      }
    })

    this.registerCommand(builtInCommandCopilotFixProblem, {
      icon: 'fix',
      title: { en: 'Fix problem', zh: '修复问题' },
      handler: ({ textDocument, problem }) => {
        const codeLink = makeCodeLinkWithRange(textDocument, problem.range)
        const message = this.i18n.t({
          en: `How to fix this problem:\n\n${codeLink}\n\n> ${problem.message}`,
          zh: `如何修复这个问题：\n\n${codeLink}\n\n> ${problem.message}`
        })
        this.copilot.addUserMessage(message, {
          title: { en: 'Fix problem', zh: '修复问题' },
          description: '',
          reactToEvents: false
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
        this.editorState.selectResource(resourceModel)
      }
    })

    this.registerCommand(builtInCommandInvokeInputHelper, {
      icon: 'modify',
      title: { en: 'Modify', zh: '修改' },
      handler: (item) => {
        this.inputHelperController.startInputing(item.id)
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

    // Clear newly inserted range when cursor position moved out of it
    this.addDisposer(
      watch(
        () => this.cursorPosition,
        (pos) => {
          if (pos == null || this.newlyInsertedLineRef.value == null || this.isNewlyInserted(pos)) return
          this.newlyInsertedLineRef.value = null
        }
      )
    )

    const startCodeUpdatedTransaction = defineIdleTransaction({
      startSpanOptions: {
        name: createCodeEditorOperationName('Code updated'),
        op: 'code-editor.update'
      },
      mergeAdjacent: true
    })

    this.addDisposer(
      watch(
        () => this.activeTextDocument,
        (td, _, onCleanup) => {
          if (td == null) return
          onCleanup(
            td.on('didChangeContent', () => {
              startCodeUpdatedTransaction()
            })
          )
        },
        { immediate: true }
      )
    )

    this.apiReferenceController.init()
    this.hoverController.init()
    this.completionController.init()
    this.contextMenuController.init()
    this.diagnosticsController.init()
    this.resourceReferenceController.init()
    this.inputHelperController.init()
    this.inlayHintController.init()
    this.dropIndicatorController.init()
  }

  dispose() {
    this.inlayHintController.dispose()
    this.inputHelperController.dispose()
    this.resourceReferenceController.dispose()
    this.diagnosticsController.dispose()
    this.contextMenuController.dispose()
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

function isPrecededByOpenBrace(s: string): boolean {
  return /\{\s*$/.test(s)
}

function isFollowedByCloseBrace(s: string) {
  return /^\s*\}/.test(s)
}
