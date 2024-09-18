// the following code may use `any` type or `force transformed` type because some type is not exported,
// whole type need from monaco-editor repo to generate new type definition, update all private type to public type to each file for every class.
// todo: generate monaco.all.ts type from https://github.com/microsoft/vscode

import {
  editor as IEditor,
  type IDisposable,
  type IPosition,
  KeyCode,
  languages,
  Range
} from 'monaco-editor'
import { reactive } from 'vue'
import type { CompletionMenuFeatureItem, MonacoCompletionModelItem } from './completion'
import { createMatches, type IMatch } from '../../common'
import { CompletionItemCache } from '@/components/editor/code-editor/ui/features/completion-menu/completion-item-cache'
import { Icon } from '@/components/editor/code-editor/EditorUI'

export interface CompletionMenuState {
  visible: boolean
  suggestions: CompletionMenuFeatureItem[]
  activeIdx: number
  position: {
    top: number
    left: number
  }
  fontSize: number
  lineHeight: number
  word: string
  completionMenuElement?: HTMLElement
}

export class CompletionMenu implements IDisposable {
  public editor: IEditor.IStandaloneCodeEditor
  public completionMenuState: CompletionMenuState = reactive({
    visible: false,
    suggestions: [],
    activeIdx: 0,
    position: {
      top: 0,
      left: 0
    },
    fontSize: 14,
    lineHeight: 19,
    word: ''
  })
  public completionItemCache = new CompletionItemCache()
  public abortController = new AbortController()
  private suggestController: any
  private suggestControllerWidget: any
  private readonly TabSize: number
  private readonly indentSymbolBySpace: string
  private viewZoneChangeAccessorState: {
    viewZoneId: string | null
    codePreviewElement: HTMLElement | null
  } = {
    viewZoneId: null,
    // no need to remove this element by self, because it will be removed by monaco editor.
    codePreviewElement: null
  }
  private monacoCompletionModelItems: MonacoCompletionModelItem[] = []
  private completionMenuItemPreviewDecorationsCollection: IEditor.IEditorDecorationsCollection

  private eventsDisposers: Array<() => void> = []

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.suggestController = editor.getContribution('editor.contrib.suggestController')
    if (!this.suggestController) throw new Error("can't find suggestController")
    this.suggestControllerWidget = this.suggestController.widget.value

    this.TabSize = editor.getModel()?.getOptions().tabSize || 4
    this.indentSymbolBySpace = ' '.repeat(this.TabSize)

    this.completionMenuItemPreviewDecorationsCollection = editor.createDecorationsCollection([])

    this.initEventListeners()
  }

  private initEventListeners() {
    const { dispose: didHideDispose } = this.suggestControllerWidget.onDidHide(() => {
      this.completionMenuState.visible = false
      this.completionMenuState.suggestions.length = 0
      this.disposeCodePreview()
    })
    const { dispose: didShowDispose } = this.suggestControllerWidget.onDidShow(() => {
      this.completionMenuState.visible = true
      this.syncCompletionMenuStateFromSuggestControllerWidget(0)
      // must be use next render time to update correct position
      setTimeout(() => this.updateCompletionMenuPosition(), 0)
    })
    const { dispose: didFocusDispose } = this.suggestControllerWidget.onDidFocus(() => {
      this.completionMenuState.visible = true
      const focusedItem = this.suggestControllerWidget.getFocusedItem()
      if (!focusedItem) return
      this.completionMenuState.word = focusedItem.item.word
      this.syncCompletionMenuStateFromSuggestControllerWidget(focusedItem.index)
      const suggestItem: MonacoCompletionModelItem = focusedItem.item
      this.disposeCodePreview()
      this.showCodePreview(
        suggestItem.position,
        suggestItem.completion.insertText,
        suggestItem.word.toLowerCase()
      )
      this.updateCompletionMenuPosition()
    })

    const { dispose: keyDownDispose } = this.editor.onKeyDown((e) => {
      if (e.keyCode === KeyCode.Escape) {
        this.abortController.abort()
      }
    })

    this.eventsDisposers.push(didHideDispose)
    this.eventsDisposers.push(didShowDispose)
    this.eventsDisposers.push(didFocusDispose)
    this.eventsDisposers.push(keyDownDispose)
  }

  private disposeCodePreview() {
    this.completionMenuItemPreviewDecorationsCollection.clear()
    this.editor.changeViewZones((changeAccessor) => {
      if (this.viewZoneChangeAccessorState.viewZoneId) {
        changeAccessor.removeZone(this.viewZoneChangeAccessorState.viewZoneId)
        this.viewZoneChangeAccessorState.viewZoneId = null
      }
    })
  }

  private createCodePreviewDomNode(codeLines: string[]) {
    const containerElement = document.createElement('div')
    containerElement.classList.add('view-lines')
    containerElement.innerHTML = codeLines
      .map(
        (line, i) =>
          `<div style="top: ${i * this.completionMenuState.lineHeight}px;" class="view-line">
              <span class="mtk1 completion-menu__item-preview">${line}</span>
           </div>`
      )
      .join('')
    return containerElement
  }

  private syncCompletionMenuStateFromSuggestControllerWidget(activeIdx: number = 0) {
    // when trigger by inner code, we need check `_completionModel` is not undefined
    if (!this.suggestControllerWidget._completionModel) return
    if (activeIdx < 0 || activeIdx >= this.suggestControllerWidget._completionModel.items.length)
      return
    this.monacoCompletionModelItems = this.suggestControllerWidget._completionModel.items
    this.completionMenuState.activeIdx = activeIdx
    this.completionMenuState.suggestions = this.completionModelItems2CompletionItems(
      this.monacoCompletionModelItems
    )
    if (this.completionMenuState.suggestions.length === 0) this.hideCompletionMenu()
  }

  private showCodePreview(position: IPosition, insertText: string, word: string) {
    if (!word || !insertText) return
    if (!insertText.toLowerCase().startsWith(word)) return
    const resolvedInsertText = insertText
      // replace placeholder with inside content. like: ${1:message} => message for better user experience
      .replace(/\$\{\d+:(.*?)}/g, (_, placeholderContent: string) => placeholderContent)
      // replace tab with space
      .replace(/\t/g, this.indentSymbolBySpace)

    const lines = resolvedInsertText.split('\n')
    const firstLine = lines.shift()
    const isMultiLine = lines.length > 1
    if (!firstLine) return console.warn('completion menu item preview error: empty first line')

    // single line code preview
    const remainWords = firstLine.substring(word.length)
    // occasionally, a column may be slightly larger than the actual column by just one unit. This can prevent the inline code preview from displaying correctly.
    // to avoid this, we need to subtract 1 from the column value.
    const startColumn = position.column - 1
    const endColum = startColumn + word.length

    this.completionMenuItemPreviewDecorationsCollection.set([
      {
        range: new Range(position.lineNumber, startColumn, position.lineNumber, endColum),
        options: {
          after: {
            content: remainWords,
            inlineClassName: 'completion-menu__item-preview'
          }
        }
      }
    ])

    if (!isMultiLine) return
    // multi lines code preview

    this.editor.changeViewZones((changeAccessor) => {
      this.viewZoneChangeAccessorState.codePreviewElement = this.createCodePreviewDomNode(lines)
      this.viewZoneChangeAccessorState.viewZoneId = changeAccessor.addZone({
        afterLineNumber: position.lineNumber,
        heightInLines: lines.length,
        domNode: this.viewZoneChangeAccessorState.codePreviewElement
      })
    })
  }

  private updateCompletionMenuPosition() {
    const position = this.editor.getPosition()
    if (!position) return
    const completionMenuElement = this.completionMenuState.completionMenuElement
    if (!completionMenuElement) return
    const pixelPosition = this.editor.getScrolledVisiblePosition(position)
    if (!pixelPosition) return
    const fontSize = this.editor.getOption(IEditor.EditorOption.fontSize)
    const isMultiline = () => {
      const { suggestions, activeIdx } = this.completionMenuState
      if (activeIdx < 0 || activeIdx >= suggestions.length) return false
      const activeSuggestion = suggestions[activeIdx]
      if (!activeSuggestion.insertText) return false
      const lines = activeSuggestion.insertText.split('\n')
      if (
        !lines.shift()?.toLocaleLowerCase().startsWith(this.completionMenuState.word.toLowerCase())
      )
        return false
      return lines.length > 0
    }

    const cursorY = pixelPosition.top
    const windowHeight = window.innerHeight
    const completionMenuHeight = completionMenuElement.offsetHeight
    this.completionMenuState.fontSize = Math.round(fontSize)
    this.completionMenuState.lineHeight = pixelPosition.height
    this.completionMenuState.position.left = pixelPosition.left
    this.completionMenuState.position.top = cursorY + pixelPosition.height

    if (windowHeight - cursorY > completionMenuHeight && !isMultiline()) {
      completionMenuElement.parentElement?.classList.remove('completion-menu--reverse-up')
    } else {
      completionMenuElement.parentElement?.classList.add('completion-menu--reverse-up')
    }
  }

  private completionModelItems2CompletionItems(
    completionModelItems: MonacoCompletionModelItem[]
  ): CompletionMenuFeatureItem[] {
    return completionModelItems.map(({ completion, score }) => {
      const cacheIdx = Number(completion.documentation)
      const completionCacheItem = this.completionItemCache.getCompletionCacheItemByIdx(cacheIdx)
      if (!completionCacheItem) {
        return {
          icon: completionItemKind2Icon(completion.kind),
          label: completion.label as string,
          insertText: completion.insertText,
          desc: completion.detail || '',
          matches: createMatches(score)
        }
      } else {
        return {
          ...completionCacheItem,
          matches: createMatches(score)
        }
      }
    })
  }

  public refreshAbortController() {
    this.abortController.abort()
    const abortController = new AbortController()
    this.abortController = abortController
    return abortController
  }

  public showCompletionMenu() {
    this.completionMenuState.visible = true
    this.editor.trigger('keyboard', 'editor.action.triggerSuggest', {})
  }

  public hideCompletionMenu() {
    this.completionMenuState.visible = false
    this.editor.trigger('editor', 'hideSuggestWidget', {})
  }

  public select(idx: number) {
    const completionItems: MonacoCompletionModelItem[] = this.monacoCompletionModelItems
    if (!completionItems.length || idx < 0 || idx >= completionItems.length) return
    this.suggestControllerWidget._select(completionItems[idx], idx)
  }

  public dispose() {
    this.eventsDisposers.forEach((dispose) => dispose())
    this.completionItemCache.dispose()
    this.disposeCodePreview()
    this.abortController.abort()
  }
}

// todo: add more case to satisfy completion item label content for better user understanding
function completionItemKind2Icon(completionIcon: languages.CompletionItemKind): Icon {
  switch (completionIcon) {
    case languages.CompletionItemKind.Function:
      return Icon.Function
    case languages.CompletionItemKind.Variable:
      return Icon.Property
    case languages.CompletionItemKind.Constant:
      return Icon.Property
    case languages.CompletionItemKind.Snippet:
      return Icon.Function
    default:
      return Icon.Property
  }
}

export function icon2CompletionItemKind(icon: Icon): languages.CompletionItemKind {
  switch (icon) {
    case Icon.Function:
      return languages.CompletionItemKind.Function
    case Icon.Property:
      return languages.CompletionItemKind.Variable
    case Icon.Keywords:
      return languages.CompletionItemKind.Snippet
    default:
      return languages.CompletionItemKind.Variable
  }
}

/** resolve suggest matches to highlight, only used for split label and highlight */
export function resolveSuggestMatches2Highlight(
  label: string,
  matches: IMatch[]
): Array<{
  text: string
  highlighted: boolean
}> {
  const result = []
  let currentIndex = 0

  for (const match of matches) {
    const { start, end } = match

    if (currentIndex < start) {
      result.push({
        text: label.substring(currentIndex, start),
        highlighted: false
      })
    }

    result.push({
      text: label.substring(start, end),
      highlighted: true
    })

    currentIndex = end
  }

  if (currentIndex < label.length) {
    result.push({
      text: label.substring(currentIndex),
      highlighted: false
    })
  }

  return result
}
