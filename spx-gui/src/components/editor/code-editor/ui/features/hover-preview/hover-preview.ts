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

    const HoverContribute: any = editor.getContribution('editor.contrib.hover')
    const HoverContentWidget = HoverContribute._getOrCreateContentWidget()
    const HoverContentWidgetOperation = HoverContentWidget._hoverOperation
    const _result_fn =
      HoverContentWidgetOperation._onResult._listeners.value.bind(HoverContentWidget)
    const _hide_fn = HoverContentWidget.hide.bind(HoverContentWidget)
    const _cancel_fn = HoverContentWidgetOperation.cancel.bind(HoverContentWidgetOperation)

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
    HoverContentWidgetOperation.onResult((result: MonacoHoverResult) => {
      _result_fn(result)
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

    HoverContentWidget.hide = () => {
      _hide_fn()
      this.editorDocumentTimer = setTimeout(() => {
        this._onHide.fire(null)
      }, 100) as unknown as number
    }

    HoverContentWidgetOperation.cancel = () => {
      _cancel_fn()
    }
  }

  dispose() {
    this._onHover.dispose()
    this._onHide.dispose()
    this.cardManager.dispose()
  }
}
