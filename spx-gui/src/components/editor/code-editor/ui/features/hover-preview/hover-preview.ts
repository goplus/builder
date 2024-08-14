import { type editor as IEditor, type IRange, Emitter, type IDisposable } from 'monaco-editor'

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

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    const HoverContribute: any = editor.getContribution('editor.contrib.hover')
    const HoverContentWidget = HoverContribute._getOrCreateContentWidget()
    const HoverContentWidgetOperation = HoverContentWidget._hoverOperation
    const raw_result_fn =
      HoverContentWidgetOperation._onResult._listeners.value.bind(HoverContentWidget)
    const raw_cancel_fn = HoverContentWidgetOperation.cancel.bind(HoverContentWidgetOperation)
    HoverContentWidgetOperation._onResult._listeners.value = () => {
      console.log('hooked')
    }

    console.log(raw_result_fn)
    HoverContentWidgetOperation.onResult((result: MonacoHoverResult) => {
      raw_result_fn(result)
      this._onHover.fire(result)
    })

    HoverContentWidgetOperation.cancel = () => {
      console.log('hide hover')
      raw_cancel_fn()
      this._onHide.fire(null)
    }
    console.log(HoverContentWidget)
  }

  dispose() {
    this._onHover.dispose()
  }
}
