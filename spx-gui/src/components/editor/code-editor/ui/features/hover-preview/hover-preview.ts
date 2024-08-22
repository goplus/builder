import { type editor as IEditor, type IRange, Emitter, type IDisposable } from 'monaco-editor'
import { CardManager } from './card-manager'
import type { AppContext } from 'vue'
// this type is generated from console.log(), not full types, only necessary for using
export interface MonacoHoverResult {
  hasLoadingMessage: boolean
  isComplete: boolean
  value: Array<{
    contents: Array<{
      value: string
    }>
    isBeforeContent: boolean
    ordinal: number
    range: IRange
  }>
}

export class HoverPreview implements IDisposable {
  private editor: IEditor.IStandaloneCodeEditor
  private readonly appContext: AppContext
  private readonly _onHover = new Emitter<MonacoHoverResult>()
  private readonly _onHide = new Emitter<null>()
  public readonly onHover = this._onHover.event
  public readonly onHide = this._onHide.event
  private cardManager: CardManager
  private editorDocumentTimer: number | null = null
  private editorDocumentRange: IRange | null = null

  constructor(editor: IEditor.IStandaloneCodeEditor, appContext: AppContext) {
    this.editor = editor
    this.appContext = appContext
    this.cardManager = new CardManager(appContext)
    const hoverContribution: any = editor.getContribution('editor.contrib.hover')
    const hoverContentWidget = hoverContribution._getOrCreateContentWidget()
    const hoverContentWidgetOperation = hoverContentWidget._hoverOperation
    const rawResultFn =
      hoverContentWidgetOperation._onResult._listeners.value.bind(hoverContentWidget)
    const hideFn = hoverContentWidget.hide.bind(hoverContentWidget)

    editor.onMouseMove((e) => {
      if (!e.target.range) return
      const word = this.editor.getModel()?.getWordAtPosition({
        lineNumber: e.target.range.endLineNumber,
        column: e.target.range.endColumn
      })
      if (word) {
        if (word.startColumn < e.target.mouseColumn && word.endColumn > e.target.mouseColumn) {
          // console.log('=>(hover-preview.ts:44) word', word)
        }
      }

      if (!this.editorDocumentRange || !e.target.range) return
      if (
        e.target.range.startColumn < this.editorDocumentRange.startColumn ||
        e.target.range.endColumn > this.editorDocumentRange.endColumn
      ) {
        this._onHide.fire(null)
      } else if (
        e.target.range.startLineNumber < this.editorDocumentRange.startLineNumber ||
        e.target.range.endLineNumber > this.editorDocumentRange.endLineNumber
      ) {
        this._onHide.fire(null)
      }
    })
    hoverContentWidgetOperation.onResult((result: MonacoHoverResult) => {
      rawResultFn(result)
      // console.log('=>(hover-preview.ts:53) result', result)

      const containerRect = editor.getContainerDomNode().getBoundingClientRect()
      const hoverContent = result.value.shift()
      if (!hoverContent) return
      this.editorDocumentRange = hoverContent.range
      const top =
        containerRect.top +
        editor.getBottomForLineNumber(hoverContent.range.endLineNumber) -
        editor.getScrollTop()

      const left =
        containerRect.left +
        (editor.getScrolledVisiblePosition({
          lineNumber: hoverContent.range.endLineNumber,
          column: hoverContent.range.startColumn
        })?.left || 0)

      const { close } = this.cardManager.renderDocument(
        hoverContent.contents.shift()?.value || '',
        {
          top: top + 4 + 'px',
          left: left + 'px'
        },
        () => {
          if (this.editorDocumentTimer) {
            clearTimeout(this.editorDocumentTimer)
            this.editorDocumentTimer = null
          }
        }
      )
      this._onHover.fire(result)
      this.onHide(() => {
        close()
      })
    })

    hoverContentWidget.hide = () => {
      hideFn()
      this.editorDocumentTimer = setTimeout(() => {
        this._onHide.fire(null)
      }, 500) as unknown as number
    }
  }

  dispose() {
    this._onHover.dispose()
    this._onHide.dispose()
    this.cardManager.dispose()
  }
}
