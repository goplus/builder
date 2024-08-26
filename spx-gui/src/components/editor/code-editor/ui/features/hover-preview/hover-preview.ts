import { editor as IEditor, type IRange, type IDisposable } from 'monaco-editor'
import { type AppContext, h, render, Transition, type VNode } from 'vue'
import type { DocPreview } from '@/components/editor/code-editor/EditorUI'
import DocumentPreviewComponent from '@/components/editor/code-editor/ui/features/hover-preview/DocumentPreview.vue'

export class HoverPreview implements IDisposable {
  private editor: IEditor.IStandaloneCodeEditor
  // classic ts type matches error between Browser timer and Node.js timer, god knows why 2024 still has this problem.
  // overview: https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  // here can use force transformed type.
  // or use `ReturnType<typeof setTimeout>`
  private editorDocumentTimer: ReturnType<typeof setTimeout> | null = null
  private readonly appContext: AppContext
  private readonly cardContainer: HTMLDivElement
  private documentRange: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  } = {
    startLineNumber: 0,
    startColumn: 0,
    endLineNumber: 0,
    endColumn: 0
  }

  constructor(editor: IEditor.IStandaloneCodeEditor, appContext: AppContext) {
    this.editor = editor
    this.appContext = appContext

    this.cardContainer = document.createElement('div')
    this.cardContainer.style.cssText = `
      position: fixed;
      inset: 0;
      width: 0;
      height: 0;
      z-index: 999;
    `
    document.body.appendChild(this.cardContainer)

    this.editor.onMouseMove((e) => this.onMousemove(e.target))
  }

  showDocument(docPreview: DocPreview, range: IRange) {
    if (!docPreview.content) return
    const containerRect = this.editor.getContainerDomNode().getBoundingClientRect()
    const scrolledVisiblePosition = this.editor.getScrolledVisiblePosition({
      lineNumber: range.endLineNumber,
      column: range.startColumn
    })
    if (!scrolledVisiblePosition) return
    if (this.editorDocumentTimer) clearTimeout(this.editorDocumentTimer)

    this.documentRange = { ...range }
    const top = containerRect.top + scrolledVisiblePosition.top + scrolledVisiblePosition.height
    const left = containerRect.left + scrolledVisiblePosition.left
    this.renderDocument(
      h(DocumentPreviewComponent, {
        content: docPreview.content,
        moreActions: docPreview.moreActions,
        recommendAction: docPreview.recommendAction,
        style: {
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`
        },
        onClose: () => this.hideDocument(),
        onMouseenter: () => {
          if (this.editorDocumentTimer) clearTimeout(this.editorDocumentTimer)
        }
      })
    )
  }

  renderDocument(documentNode: VNode | null) {
    const vNode = h(
      Transition,
      {
        appear: true
      },
      () => documentNode
    )
    vNode.appContext = this.appContext
    render(vNode, this.cardContainer)
  }

  hideDocument(immediately: boolean = false) {
    if (immediately) {
      return this.renderDocument(null)
    } else {
      if (this.editorDocumentTimer) clearTimeout(this.editorDocumentTimer)
      this.editorDocumentTimer = setTimeout(() => this.renderDocument(null), 300)
    }
  }

  onMousemove(target: IEditor.IMouseTarget) {
    if (target.type !== IEditor.MouseTargetType.CONTENT_TEXT) return this.hideDocument(true)
    const position = this.editor.getModel()?.getWordAtPosition({
      column: target.range.startColumn,
      lineNumber: target.range.startLineNumber
    })
    if (!position || !position.word) return this.hideDocument(true)
    const { startColumn, endColumn } = position
    if (this.documentRange.startColumn < startColumn && this.documentRange.endColumn > endColumn) {
      return this.hideDocument()
    }
  }

  dispose() {
    this.cardContainer.remove()
  }
}
