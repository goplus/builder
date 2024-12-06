import { computed, shallowReactive, shallowRef, watch } from 'vue'
import Emitter from '@/utils/emitter'
import {
  DefinitionKind,
  type BaseContext,
  type DefinitionDocumentationString,
  type Position,
  type ITextDocument
} from '../../common'
import type { CodeEditorUI } from '..'
import { toMonacoRange, type monaco, positionEq } from '../common'
import { fuzzyScoreGracefulAggressive as fuzzyScore, type FuzzyScore } from './fuzzy'

export type CompletionContext = BaseContext

export type CompletionItemKind = DefinitionKind

export type CompletionItem = {
  label: string
  kind: CompletionItemKind
  // TODO: support `insertText`
  documentation: DefinitionDocumentationString
}

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}

export type InternalCompletionItem = CompletionItem & {
  /** Fuzzy score */
  score: FuzzyScore
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

  widgetEl = document.createElement('div')

  private widget = {
    getId: () => `completion-for-${this.ui.id}`,
    getDomNode: () => this.widgetEl,
    getPosition: () => {
      if (this.nonEmptyItems == null) return null
      const monaco = this.ui.monaco
      const cursorPos = this.ui.editor.getPosition()
      return {
        position: cursorPos,
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE
        ]
      }
    }
  } satisfies monaco.editor.IContentWidget

  private currentCompletionRef = shallowRef<{
    ctrl: AbortController
    textDocument: ITextDocument
    position: Position
    wordStart: Position
    items: CompletionItem[] | null
  } | null>(null)

  get currentCompletion() {
    return this.currentCompletionRef.value
  }

  private filteredItemsComputed = computed(() => {
    const currentCompletion = this.currentCompletion
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

  private async loadCompletionItems() {
    const completion = this.currentCompletion
    if (this.provider == null || completion == null) return
    const items = await this.provider.provideCompletion(
      {
        signal: completion.ctrl.signal,
        textDocument: completion.textDocument
      },
      completion.position
    )
    completion.ctrl.signal.throwIfAborted()
    completion.items = items
  }

  private startCompletion(textDocument: ITextDocument, position: Position) {
    this.currentCompletionRef.value?.ctrl.abort()
    const word = textDocument.getWordAtPosition(position)
    const wordStart = word != null ? { line: position.line, column: word.startColumn } : position
    this.currentCompletionRef.value = shallowReactive({
      ctrl: new AbortController(),
      textDocument,
      position,
      wordStart,
      items: null
    })
    this.loadCompletionItems()
    return this.currentCompletionRef.value
  }

  /** Update position of current completion to trigger refilter */
  private refilterCompletion(position: Position) {
    const currentCompletion = this.currentCompletion
    if (currentCompletion == null) return
    currentCompletion.position = position
  }

  stopCompletion() {
    if (this.currentCompletionRef.value == null) return
    this.currentCompletionRef.value.ctrl.abort()
    this.currentCompletionRef.value = null
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

    if (this.currentCompletion != null) {
      const word = textDocument.getWordAtPosition(position)
      const wordStart = word != null ? { line: position.line, column: word.startColumn } : position
      if (
        this.currentCompletion.textDocument === textDocument &&
        positionEq(this.currentCompletion.wordStart, wordStart)
      ) {
        // cursor moved within the same word
        this.refilterCompletion(position)
        return
      }
    }

    this.startCompletion(textDocument, position)
  }

  applyCompletionItem(item: InternalCompletionItem) {
    const { editor, cursorPosition } = this.ui
    if (this.currentCompletion == null) return
    const { wordStart, position } = this.currentCompletion
    if (!positionEq(cursorPosition, position)) return
    editor.executeEdits('completion', [
      {
        range: toMonacoRange({
          start: wordStart,
          end: position
        }),
        text: item.label
      }
    ])
    this.stopCompletion()
    editor.focus()
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

    // Manage completion widget (visibility, position, ...)
    editor.addContentWidget(this.widget)
    this.addDisposer(() => editor.removeContentWidget(this.widget))
    this.addDisposer(
      watch(
        () => this.nonEmptyItems,
        () => editor.layoutContentWidget(this.widget)
      )
    )
    this.addDisposer(
      watch(
        () => [this.ui.activeTextDocument, this.ui.cursorPosition] as const,
        ([textDocument, position]) => {
          if (this.currentCompletion == null) return
          if (
            this.currentCompletion.textDocument !== textDocument ||
            !positionEq(this.currentCompletion.position, position)
          ) {
            this.stopCompletion()
            editor.layoutContentWidget(this.widget)
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
        if (this.currentCompletion != null && e.source === 'deleteLeft') {
          // completion is active and something like backspace is used
          this.checkAndTrigger()
          return
        }
        if (this.currentCompletion != null && e.reason === reasons.Explicit) {
          // completion is active and something like cursor keys are used to move the cursor
          this.checkAndTrigger()
        }
      })
    )
  }
}

function shouldTriggerCompletion(char: string) {
  return /\w/.test(char)
}

function compareItems(a: InternalCompletionItem, b: InternalCompletionItem) {
  if (a.score[0] > b.score[0]) {
    return -1
  } else if (a.score[0] < b.score[0]) {
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
