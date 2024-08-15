// the following code may use `any` type or `force transformed` type because some type is not exported,
// whole type need from monaco-editor repo to generate new type definition, update all private type to public type to each file for every class.
// todo: generate monaco.all.ts type from https://github.com/microsoft/vscode

import {
  editor as IEditor,
  editor,
  Emitter,
  type IDisposable,
  type IPosition,
  languages,
  Range
} from 'monaco-editor'
import { reactive, type UnwrapNestedRefs } from 'vue'
import type { CompletionMenuFeatureItem, MonacoCompletionModelItem } from './completion'
import { IconEnum, createMatches, type IMatch } from '../../common'
import EditorOption = editor.EditorOption
import { CompletionItemCache } from '@/components/editor/code-editor/ui/features/completion-menu/completion-item-cache'

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
  private _onHide = new Emitter<void>()
  private _onShow = new Emitter<void>()
  private _onFocus = new Emitter<void>()
  private editor: IEditor.IStandaloneCodeEditor
  public completionMenuState: UnwrapNestedRefs<CompletionMenuState>
  public completionItemCache = new CompletionItemCache()
  private suggestController: any
  private suggestControllerWidget: any
  private readonly TabSize: number
  private readonly indentSymbolBySpace: string
  private viewZoneChangeAccessorState: {
    viewZoneId: string | null
    codePreviewElement: HTMLElement | null
  }
  private monacoCompletionModelItems: MonacoCompletionModelItem[] = []
  private completionMenuItemPreviewDecorationsCollection: IEditor.IEditorDecorationsCollection

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.suggestController = editor.getContribution('editor.contrib.suggestController')
    if (!this.suggestController) throw new Error("can't find suggestController")
    this.suggestControllerWidget = this.suggestController.widget.value

    this.completionMenuState = reactive({
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

    this.TabSize = editor.getModel()?.getOptions().tabSize || 4
    this.indentSymbolBySpace = ' '.repeat(this.TabSize)

    this.viewZoneChangeAccessorState = {
      viewZoneId: null,
      // no need to remove this element by self, because it will be removed by monaco editor.
      codePreviewElement: null
    }
    this.completionMenuItemPreviewDecorationsCollection = editor.createDecorationsCollection([])

    this.initEventListeners()
  }

  private initEventListeners() {
    this._onHide.event(this.onHide, this)
    this._onShow.event(this.onShow, this)
    this._onFocus.event(this.onFocus, this)

    this.suggestControllerWidget.onDidHide(() => this._onHide.fire())
    this.suggestControllerWidget.onDidShow(() => this._onShow.fire())
    this.suggestControllerWidget.onDidFocus(() => this._onFocus.fire())
  }

  private onShow() {
    this.completionMenuState.visible = true
    this.syncCompletionMenuStateFromSuggestControllerWidget(0)
    // must be use next render time to update correct position
    setTimeout(() => this.updateCompletionMenuPosition(), 0)
  }

  private onHide() {
    this.completionMenuState.visible = false
    this.completionMenuState.suggestions.length = 0
    this.disposeCodePreview()
  }

  private onFocus() {
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
    const LINE_HEIGHT = this.completionMenuState.lineHeight
    const $codeContainer = document.createElement('div')
    $codeContainer.classList.add('view-lines')
    $codeContainer.innerHTML = codeLines
      .map(
        (line, i) =>
          `<div style="top: ${i * LINE_HEIGHT}px;" class="view-line">
              <span class="mtk1 completion-menu__item-preview">${line}</span>
           </div>`
      )
      .join('')
    return $codeContainer
  }

  private showMultiCodePreview(position: IPosition, codeLines: string[]) {
    const _codeLines = codeLines.map((content) =>
      content.replace(/* here replace `space` to html space(&nbsp;) */ / /g, '&nbsp;')
    )
    this.editor.changeViewZones((changeAccessor) => {
      this.viewZoneChangeAccessorState.codePreviewElement =
        this.createCodePreviewDomNode(_codeLines)
      this.viewZoneChangeAccessorState.viewZoneId = changeAccessor.addZone({
        afterLineNumber: position.lineNumber,
        heightInLines: _codeLines.length,
        domNode: this.viewZoneChangeAccessorState.codePreviewElement
      })
    })
  }

  private showSingleCodePreview(position: IPosition, word: string, line: string) {
    const remainWords = line.substring(word.length)
    // Occasionally, a column may be slightly larger than the actual column by just one unit. This can prevent the inline code preview from displaying correctly.
    // To avoid this, we need to subtract 1 from the column value.
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
  }

  private syncCompletionMenuStateFromSuggestControllerWidget(activeIdx: number = 0) {
    if (activeIdx < 0 || activeIdx >= this.suggestControllerWidget._completionModel.items.length)
      return
    this.monacoCompletionModelItems = this.suggestControllerWidget._completionModel.items
    this.completionMenuState.activeIdx = activeIdx
    this.completionMenuState.suggestions = this.completionModelItems2CompletionItems(
      this.monacoCompletionModelItems
    )
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
    if (isMultiLine) this.showMultiCodePreview(position, lines)
    this.showSingleCodePreview(position, word, firstLine)
  }

  select(idx: number) {
    const completionItems: MonacoCompletionModelItem[] = this.monacoCompletionModelItems
    if (!completionItems.length || idx < 0 || idx >= completionItems.length) return
    this.suggestControllerWidget._select(completionItems[idx], idx)
  }

  dispose() {
    this._onFocus.dispose()
    this._onShow.dispose()
    this._onHide.dispose()
    this.completionItemCache.dispose()
    this.disposeCodePreview()
  }

  private updateCompletionMenuPosition() {
    const position = this.editor.getPosition()
    if (!position) return
    const completionMenuElement = this.completionMenuState.completionMenuElement
    if (!completionMenuElement) return
    const pixelPosition = this.editor.getScrolledVisiblePosition(position)
    if (!pixelPosition) return
    const fontSize = Number(this.editor.getOption(EditorOption.fontLigatures))
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
      completionMenuElement.classList.remove('completion-menu--reverse-up')
    } else {
      completionMenuElement.classList.add('completion-menu--reverse-up')
    }
  }

  private completionModelItems2CompletionItems(
    completionModelItems: MonacoCompletionModelItem[]
  ): CompletionMenuFeatureItem[] {
    // todo: this is temp code, need to combine with other preview.
    return completionModelItems.map((completion) => {
      return {
        icon: completionItemKind2Icon(completion.completion.kind),
        label: completion.completion.label as string,
        preview: {
          content: ''
        },
        insertText: completion.completion.insertText,
        desc: completion.completion.detail || '',
        matches: createMatches(completion.score)
      }
    })
  }
}

// todo: add more case to satisfy completion item label content for better user understanding
function completionItemKind2Icon(completionIcon: languages.CompletionItemKind): IconEnum {
  switch (completionIcon) {
    case languages.CompletionItemKind.Function:
      return IconEnum.Function
    case languages.CompletionItemKind.Variable:
      return IconEnum.Prototype
    case languages.CompletionItemKind.Constant:
      return IconEnum.Prototype
    case languages.CompletionItemKind.Snippet:
      return IconEnum.Function
    default:
      return IconEnum.Prototype
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
