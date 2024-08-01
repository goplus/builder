// this is temp file will merge into monaco.ts after type error is totally resolved
// the following code may use `any` type or `force transformed` type because some type is not exported,
// whole type need from monaco-editor repo to generate new type definition, update all private type to public type to each file for every class.
// todo: generate monaco.all.ts type from https://github.com/microsoft/vscode

import { editor as IEditor, type IDisposable, type IPosition } from 'monaco-editor'
import { languages, Range } from 'monaco-editor'
import type { UnwrapNestedRefs } from 'vue'
import type { CompletionMenuItem, MonacoCompletionModelItem } from '../tools/completion'

import { IconEnum } from '../tools'
import { createMatches } from '../tools/monaco-editor-core'
import CompletionItemKind = languages.CompletionItemKind

export interface CompletionMenuState {
  visible: boolean
  suggestions: CompletionMenuItem[]
  activeIdx: number
  position: {
    top: number
    left: number
  }
  lineHeight: number
  word: string
}

type EventCallback = () => void

export class CompletionMenuProvider implements IDisposable {
  private static providerId: string = this.name
  private editor: IEditor.IStandaloneCodeEditor
  private completionMenuState: UnwrapNestedRefs<CompletionMenuState>
  private suggestController: any
  private suggestControllerWidget: any
  private readonly TabSize: number
  private readonly indentSymbolBySpace: string
  private viewZoneChangeAccessorState: {
    viewZoneId: string | null
    $codePreviewContainer: HTMLElement | null
  }
  private completionMenuItemPreviewDecorationsCollection: IEditor.IEditorDecorationsCollection
  private readonly events: {
    onShow: EventCallback[]
    onHide: EventCallback[]
    onFocus: EventCallback[]
    onSelect: EventCallback[]
  }

  constructor(
    editor: IEditor.IStandaloneCodeEditor,
    completionMenuState: UnwrapNestedRefs<CompletionMenuState>
  ) {
    this.editor = editor
    this.completionMenuState = completionMenuState
    this.suggestController = editor.getContribution('editor.contrib.suggestController')
    if (!this.suggestController) throw new Error("can't find suggestController")
    this.suggestControllerWidget = this.suggestController.widget.value

    this.TabSize = editor.getModel()?.getOptions().tabSize || 4
    this.indentSymbolBySpace = ' '.repeat(this.TabSize)

    this.viewZoneChangeAccessorState = {
      viewZoneId: null,
      // no need to remove this element by self, because it will be removed by monaco editor.
      $codePreviewContainer: null
    }
    this.completionMenuItemPreviewDecorationsCollection = editor.createDecorationsCollection([])

    this.events = {
      onShow: [],
      onHide: [],
      onFocus: [],
      onSelect: []
    }

    this.initEventListeners()
  }

  private initEventListeners() {
    this.suggestControllerWidget.onDidHide(() => {
      this.completionMenuState.visible = false
      this.completionMenuState.suggestions.length = 0
      this.disposeCodePreview()
      this.fireEvent('onHide')
    })

    this.suggestControllerWidget.onDidShow(() => {
      this.completionMenuState.visible = true
      this.syncCompletionMenuStateFromSuggestControllerWidget(0)
      this.fireEvent('onShow')
    })

    this.suggestControllerWidget.onDidFocus(() => {
      // this callback will quicker than onDidShow 100ms,
      // but still not immediately show completion menu when original completion menu show up.
      // 100ms, 500ms, 1000ms. this is possible delay time to trigger this callback.
      // source from:  chrome devtools investigate runtime and debug source code to get these.
      // possible is 500ms.
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
      this.fireEvent('onFocus')
    })
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
    // for now is 19px, may need update when editor line height has changed
    const LINE_HEIGHT = 19
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

  private ShowMultiCodePreview(position: IPosition, codeLines: string[]) {
    const _codeLines = codeLines.map((content) =>
      content.replace(/* here replace `space` to html space(&nbsp;) */ / /g, '&nbsp;')
    )
    this.editor.changeViewZones((changeAccessor) => {
      this.viewZoneChangeAccessorState.$codePreviewContainer =
        this.createCodePreviewDomNode(_codeLines)
      this.viewZoneChangeAccessorState.viewZoneId = changeAccessor.addZone({
        afterLineNumber: position.lineNumber,
        heightInLines: _codeLines.length,
        domNode: this.viewZoneChangeAccessorState.$codePreviewContainer
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
    const completionItems: MonacoCompletionModelItem[] =
      this.suggestControllerWidget._completionModel.items
    this.completionMenuState.activeIdx = activeIdx
    this.completionMenuState.suggestions =
      this.completionModelItems2CompletionItems(completionItems)
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
    if (isMultiLine) this.ShowMultiCodePreview(position, lines)
    this.showSingleCodePreview(position, word, firstLine)
  }

  fireEvent(event: keyof typeof this.events) {
    this.events[event].forEach((callback) => callback())
  }

  addEventListener(event: keyof typeof this.events, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  removeEventListener(event: keyof typeof this.events, callback: EventCallback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback)
    }
  }

  disposeAllEventListener() {
    for (const event in this.events) {
      this.events[event as keyof typeof this.events].length = 0
    }
  }

  dispose() {
    // inner monaco editor will dispose suggest controller widget before dispose editor
    this.disposeCodePreview()
    this.disposeAllEventListener()
  }

  select(idx: number) {
    const completionItems: MonacoCompletionModelItem[] =
      this.suggestControllerWidget._completionModel.items
    if (!completionItems.length || idx < 0 || idx >= completionItems.length) return
    this.suggestControllerWidget._select(completionItems[idx], idx)
  }

  private completionModelItems2CompletionItems(
    completionModelItems: MonacoCompletionModelItem[]
  ): CompletionMenuItem[] {
    // todo: this is temp code, need to combine with other preview.
    return completionModelItems.map((completion) => {
      return {
        icon: this.completionItemKind2Icon(completion.completion.kind),
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

  completionItemKind2Icon(completionIcon: CompletionItemKind): IconEnum {
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
}
