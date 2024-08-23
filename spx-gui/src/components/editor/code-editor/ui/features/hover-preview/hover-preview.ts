import { type editor as IEditor, type IRange, type IDisposable } from 'monaco-editor'
import { CardManager } from './card-manager'
import type { AppContext } from 'vue'
import type { DocPreview } from '@/components/editor/code-editor/EditorUI'

export class HoverPreview implements IDisposable {
  private editor: IEditor.IStandaloneCodeEditor
  private cardManager: CardManager
  private editorDocumentTimer: number | null = null

  constructor(editor: IEditor.IStandaloneCodeEditor, appContext: AppContext) {
    this.editor = editor
    this.cardManager = new CardManager(appContext)
  }

  showDocument(docPreview: DocPreview, range: IRange) {
    if (!docPreview.content) return
    const containerRect = this.editor.getContainerDomNode().getBoundingClientRect()
    const top =
      containerRect.top +
      this.editor.getBottomForLineNumber(range.endLineNumber) -
      this.editor.getScrollTop()

    const left =
      containerRect.left +
      (this.editor.getScrolledVisiblePosition({
        lineNumber: range.endLineNumber,
        column: range.startColumn
      })?.left || 0)

    this.cardManager.renderDocument(
      docPreview,
      {
        top: top + 4 + 'px', // 4 means hover codes line padding
        left: left + 'px'
      },
      {
        onMouseenter: () => {
          if (!this.editorDocumentTimer) return
          clearTimeout(this.editorDocumentTimer)
          this.editorDocumentTimer = null
        }
      }
    )
  }

  dispose() {
    this.cardManager.dispose()
  }
}
