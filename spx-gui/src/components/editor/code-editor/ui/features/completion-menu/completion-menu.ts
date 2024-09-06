// the following code may use `any` type or `force transformed` type because some type is not exported,
// whole type need from monaco-editor repo to generate new type definition, update all private type to public type to each file for every class.
// todo: generate monaco.all.ts type from https://github.com/microsoft/vscode

import { editor as IEditor, editor, type IPosition, languages, Range } from 'monaco-editor'
import { reactive } from 'vue'
import { type FuzzyScore, type IMatch } from '../../common'
import { type CompletionItem, Icon } from '@/components/editor/code-editor/EditorUI'
import { Disposable } from '@/utils/disposable'

export interface CompletionMenuState {
  visible: boolean
  suggestions: CompletionItem[]
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

export class CompletionMenu extends Disposable {
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
  private completionMenuItemPreviewDecorationsCollection: IEditor.IEditorDecorationsCollection

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    super()
    this.editor = editor
    this.suggestController = editor.getContribution('editor.contrib.suggestController')
    if (!this.suggestController) throw new Error("can't find suggestController")
    this.suggestControllerWidget = this.suggestController.widget.value

    this.TabSize = editor.getModel()?.getOptions().tabSize || 4
    this.indentSymbolBySpace = ' '.repeat(this.TabSize)

    this.completionMenuItemPreviewDecorationsCollection = editor.createDecorationsCollection([])

    this.addDisposer(() => this.disposeCodePreview())
    this.addDisposer(() => this.abortController.abort())
    this.addDisposer(() => this.resetSuggestions())
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

  private showCodePreview(position: IPosition, insertText: string, word: string) {
    if (!word || !insertText) return
    if (!insertText.toLowerCase().startsWith(word)) return
    const resolvedInsertText = insertText
      // replace placeholder with inside content. like: ${1:message} => message for better user experience
      .replace(/\$\{\d+:?(.*?)}/g, (_, placeholderContent: string) => placeholderContent)
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

  public resetSuggestions() {
    this.completionMenuState.suggestions.length = 0
  }

  public refreshAbortController() {
    this.abortController.abort()
    this.abortController = new AbortController()
  }

  public showCompletionMenu() {
    this.completionMenuState.visible = true
  }

  public hideCompletionMenu() {
    this.completionMenuState.visible = false
  }

  select(idx: number) {}

  public updateCompletionMenuPosition() {
    const position = this.editor.getPosition()
    if (!position) return
    const completionMenuElement = this.completionMenuState.completionMenuElement
    const pixelPosition = this.editor.getScrolledVisiblePosition(position)
    if (!completionMenuElement || !pixelPosition) return
    const fontSize = this.editor.getOption(editor.EditorOption.fontSize)
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

  public getMatchSegments(input: string, suggestion: string) {
    const lowerInput = input.toLowerCase()
    const lowerSuggestion = suggestion.toLowerCase()

    let inputIndex = 0
    let suggestionIndex = 0
    const matchSegments: Array<{
      start: number
      length: number
    }> = []

    // onAnyKey => on Key => 'on' - Any - 'Key'
    // const,   => on => [o, n]
    while (inputIndex < lowerInput.length && suggestionIndex < lowerSuggestion.length) {
      if (lowerInput[inputIndex] === lowerSuggestion[suggestionIndex]) {
        const start = suggestionIndex
        while (
          inputIndex < lowerInput.length &&
          suggestionIndex < lowerSuggestion.length &&
          lowerInput[inputIndex] === lowerSuggestion[suggestionIndex]
        ) {
          inputIndex++
          suggestionIndex++
        }
        const length = suggestionIndex - start
        matchSegments.push({ start, length })
      } else {
        suggestionIndex++
      }
    }

    return matchSegments
  }
}

export function suggestType2Icon(suggestType: string): Icon {
  switch (suggestType) {
    case 'keyword':
      return Icon.Prototype
    case 'func':
      return Icon.Function
    default:
      return Icon.Prototype
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
