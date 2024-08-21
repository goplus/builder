import { type editor as IEditor, type IRange, Emitter, type IDisposable } from 'monaco-editor'
import { CardManager } from './card-manager'
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
  private readonly _onHover = new Emitter<MonacoHoverResult>()
  private readonly _onHide = new Emitter<null>()
  public readonly onHover = this._onHover.event
  public readonly onHide = this._onHide.event
  private cardManager = new CardManager()
  private editorDocumentTimer: number | null = null
  private editorDocumentRange: IRange | null = null

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor

    const hoverContribution: any = editor.getContribution('editor.contrib.hover')
    const hoverContentWidget = hoverContribution._getOrCreateContentWidget()
    const hoverContentWidgetOperation = hoverContentWidget._hoverOperation
    const rawResultFn =
      hoverContentWidgetOperation._onResult._listeners.value.bind(hoverContentWidget)
    const HideFn = hoverContentWidget.hide.bind(hoverContentWidget)
    const CancelFn = hoverContentWidgetOperation.cancel.bind(hoverContentWidgetOperation)

    editor.onMouseMove((e) => {
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
      const containerRect = editor.getContainerDomNode().getBoundingClientRect()
      const [hoverContent] = result.value
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
      HideFn()
      this.editorDocumentTimer = setTimeout(() => {
        this._onHide.fire(null)
      }, 100) as unknown as number
    }

    hoverContentWidgetOperation.cancel = () => {
      CancelFn()
    }
  }

  dispose() {
    this._onHover.dispose()
    this._onHide.dispose()
    this.cardManager.dispose()
  }
}
