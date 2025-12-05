import { computed, shallowRef, watch } from 'vue'
import Emitter from '@/utils/emitter'
import { TaskManager } from '@/utils/task'
import {
  DefinitionKind as CompletionItemKind,
  type BaseContext,
  type DefinitionDocumentationString,
  type Position,
  positionEq
} from '../../common'
import { type monaco } from '../../monaco'
import type { CodeEditorUI } from '../code-editor-ui'
import { fuzzyScoreGracefulAggressive as fuzzyScore, type FuzzyScore } from './fuzzy'

export type CompletionContext = BaseContext

export { CompletionItemKind }

export enum InsertTextFormat {
  PlainText,
  Snippet
}

export type CompletionItem = {
  label: string
  kind: CompletionItemKind
  insertText: string
  insertTextFormat: InsertTextFormat
  documentation: DefinitionDocumentationString | null
}

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}

export type InternalCompletionItem = CompletionItem & {
  /** Fuzzy score */
  score: FuzzyScore | null
  /** Index in original list */
  originalIdx: number
}

export class CompletionController extends Emitter<{
  editorKeydown: monaco.IKeyboardEvent
}> {
  private provider: ICompletionProvider | null = null
  registerProvider(provider: ICompletionProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private filterPositionRef = shallowRef<Position | null>(null)

  private completionMgr = new TaskManager(async (signal) => {
    if (this.provider == null) return null
    const { activeTextDocument: textDocument, cursorPosition: position } = this.ui
    if (textDocument == null || position == null) return null
    this.filterPositionRef.value = position
    const word = textDocument.getWordAtPosition(position)
    const wordStart = word != null ? { line: position.line, column: word.startColumn } : position
    const ctx: CompletionContext = { textDocument, signal }
    const items = await this.provider.provideCompletion(ctx, position)
    return { textDocument, wordStart, items }
  })

  get completionError() {
    return this.completionMgr.result.error
  }

  get completion() {
    const d = this.completionMgr.result.data
    if (d == null) return null
    const position = this.filterPositionRef.value
    if (position == null) return null
    return { ...d, position }
  }

  private filteredItemsComputed = computed(() => {
    const currentCompletion = this.completion
    if (currentCompletion == null || currentCompletion.items == null) return null
    const { textDocument, wordStart, position, items } = currentCompletion
    const wordTyped = textDocument.getValueInRange({ start: wordStart, end: position })
    return filterAndSort(items, wordTyped)
  })

  get nonEmptyItems() {
    const items = this.filteredItemsComputed.value
    if (items == null || items.length === 0) return null
    return items
  }

  startCompletion() {
    this.completionMgr.start()
  }

  stopCompletion() {
    this.completionMgr.stop()
  }

  /** Update position of current completion to trigger refilter */
  private refilterCompletion(position: Position) {
    this.filterPositionRef.value = position
  }

  /** Check if completion should be triggered, and trigger if needed */
  private async checkAndTrigger(char?: string) {
    const { activeTextDocument: textDocument, cursorPosition: position } = this.ui
    if (textDocument == null || position == null) return

    if (char == null) {
      char = textDocument.getValueInRange({
        start: {
          line: position.line,
          column: position.column - 1
        },
        end: position
      })
    }

    if (!shouldTriggerCompletion(char)) {
      this.stopCompletion()
      return
    }

    if (this.completion != null) {
      const word = textDocument.getWordAtPosition(position)
      const wordStart = word != null ? { line: position.line, column: word.startColumn } : position
      if (this.completion.textDocument === textDocument && positionEq(this.completion.wordStart, wordStart)) {
        // cursor moved within the same word
        this.refilterCompletion(position)
        return
      }
    }

    this.startCompletion()
  }

  async applyCompletionItem(item: InternalCompletionItem) {
    const cursorPosition = this.ui.cursorPosition
    if (this.completion == null) return
    const { wordStart, position } = this.completion
    if (!positionEq(cursorPosition, position)) return
    const range = { start: wordStart, end: position }
    // TODO: Support newly inserted functionality (for input helper) here
    switch (item.insertTextFormat) {
      case InsertTextFormat.PlainText:
        await this.ui.insertText(item.insertText, range)
        break
      case InsertTextFormat.Snippet: {
        const parsed = this.ui.parseSnippet(item.insertText)
        await this.ui.insertSnippet(parsed.toTextmateString(), range)
        break
      }
    }
    this.stopCompletion()
  }

  init() {
    const { editor, monaco } = this.ui

    // Forward keydown event (for `CompletionCard`)
    this.addDisposable(
      editor.onKeyDown((e) => {
        this.emit('editorKeydown', e)
      })
    )

    // Typing (& composing) -> trigger completion
    let isComposing = false
    this.addDisposable(
      editor.onDidCompositionStart(() => {
        isComposing = true
      })
    )
    this.addDisposable(
      editor.onDidType(async (char) => {
        if (isComposing) return
        this.checkAndTrigger(char)
      })
    )
    this.addDisposable(
      editor.onDidCompositionEnd(async () => {
        isComposing = false
        this.checkAndTrigger()
      })
    )

    this.addDisposer(
      watch(
        () => [this.ui.activeTextDocument, this.ui.cursorPosition] as const,
        ([textDocument, position]) => {
          if (this.completion == null) return
          if (this.completion.textDocument !== textDocument || !positionEq(this.completion.position, position)) {
            this.stopCompletion()
          }
        }
      )
    )

    // Other edge cases of cursor movement
    this.addDisposable(
      editor.onDidChangeCursorSelection((e) => {
        const reasons = monaco.editor.CursorChangeReason
        if (
          !e.selection.isEmpty() ||
          (e.reason !== reasons.NotSet && e.reason !== reasons.Explicit) ||
          (e.source !== 'keyboard' && e.source !== 'deleteLeft')
        ) {
          this.stopCompletion()
          return
        }
        if (this.completion != null && e.source === 'deleteLeft') {
          // completion is active and something like backspace is used
          this.checkAndTrigger()
          return
        }
        if (this.completion != null && e.reason === reasons.Explicit) {
          // completion is active and something like cursor keys are used to move the cursor
          this.checkAndTrigger()
        }
      })
    )
  }
}

function shouldTriggerCompletion(char: string) {
  return /[\w."]/.test(char)
}

function compareItems(a: InternalCompletionItem, b: InternalCompletionItem) {
  if (a.score != null && b.score == null) {
    return -1
  } else if (a.score == null && b.score != null) {
    return 1
  } else if (a.score != null && b.score !== null && a.score[0] > b.score[0]) {
    return -1
  } else if (a.score != null && b.score !== null && a.score[0] < b.score[0]) {
    return 1
  } else if (a.originalIdx < b.originalIdx) {
    return -1
  } else if (a.originalIdx > b.originalIdx) {
    return 1
  } else {
    return 0
  }
}

function filterAndSort(items: CompletionItem[], word: string): InternalCompletionItem[] {
  if (word === '') return items.map((item, i) => ({ ...item, score: null, originalIdx: i }))
  const wordLow = word.toLowerCase()
  const result: InternalCompletionItem[] = []
  items.forEach((item, i) => {
    const score = fuzzyScore(word, wordLow, 0, item.label, item.label.toLowerCase(), 0)
    if (score == null) return
    result.push({ ...item, score, originalIdx: i })
  })
  result.sort(compareItems)
  return result
}
