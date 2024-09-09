import { editor as IEditor, type IRange, type IDisposable, Emitter } from 'monaco-editor'
import { reactive } from 'vue'
import type { DocPreview, Icon } from '@/components/editor/code-editor/EditorUI'
import type { Action, RecommendAction } from '@/components/editor/code-editor/EditorUI'

export class HoverPreview implements IDisposable {
  public editor: IEditor.IStandaloneCodeEditor
  // classic ts type matches error between Browser timer and Node.js timer, god knows why 2024 still has this problem.
  // overview: https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  // here can use force transformed type.
  // or use `ReturnType<typeof setTimeout>`
  public editorDocumentTimer: ReturnType<typeof setTimeout> | null = null
  private _onMousemove = new Emitter<IEditor.IMouseTarget>()
  private _onShowDocument = new Emitter<IRange>()
  private eventDisposables: Array<() => void> = []
  public onMousemove = this._onMousemove.event
  public onShowDocument = this._onShowDocument.event
  public hoverPreviewState = reactive<{
    visible: boolean
    focused: boolean
    range: IRange
    position: {
      top: number
      left: number
    }
    docs: Array<{
      header?: {
        icon: Icon
        declaration: string
      }
      content?: string
      moreActions?: Action[]
      recommendAction?: RecommendAction
    }>
  }>({
    visible: false,
    focused: false,
    range: {
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0
    },
    position: {
      top: 0,
      left: 0
    },
    docs: []
  })

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor

    this.eventDisposables.push(
      this.editor.onMouseMove((e) => {
        this._onMousemove.fire(e.target)
      }).dispose
    )
  }

  public showDocuments(_docPreviews: DocPreview[], range: IRange) {
    if (!_docPreviews.length) return
    if (this.hoverPreviewState.focused) return
    const docPreviews = _docPreviews.filter(
      (docPreview) => Boolean(docPreview.content) || Boolean(docPreview.header)
    )
    this.hoverPreviewState.docs = docPreviews
      .sort((a, b) => b.level - a.level)
      .map((docPreview) => ({
        header: docPreview.header,
        content: docPreview.content,
        moreActions: docPreview.moreActions,
        recommendAction: docPreview.recommendAction
      }))
    this._onShowDocument.fire(range)
  }

  public hideDocument(immediately: boolean = false) {
    if (immediately) {
      this.hoverPreviewState.visible = false
    } else {
      this.tryToPreventHideDocument()
      this.editorDocumentTimer = setTimeout(() => {
        this.hoverPreviewState.visible = false
      }, 300)
    }
  }

  public tryToPreventHideDocument() {
    if (this.editorDocumentTimer) {
      clearTimeout(this.editorDocumentTimer)
      this.editorDocumentTimer = null
    }
  }

  dispose() {
    this._onMousemove.dispose()
    this._onShowDocument.dispose()
    this.eventDisposables.forEach((dispose) => dispose())
  }
}
