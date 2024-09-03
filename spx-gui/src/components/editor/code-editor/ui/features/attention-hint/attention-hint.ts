import { editor as IEditor, type IDisposable, type IRange, Range } from 'monaco-editor'
import { StyleSheetContent } from '@/components/editor/code-editor/ui/common/style-sheet-content'

export class AttentionHint extends StyleSheetContent implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  attentionHintDecoration: IEditor.IEditorDecorationsCollection
  abortController = new AbortController()

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    super()
    this.editor = editor
    this.attentionHintDecoration = this.editor.createDecorationsCollection()
  }

  createWarningAttentionHint(range: IRange, content: string) {
    return {
      range: new Range(range.startLineNumber, 1, range.startLineNumber, 1),
      options: {
        className: 'attention-hint__warning',
        isWholeLine: true,
        afterContentClassName: `attention-hint__warning-text ${this.addPseudoElementClassNameWithHashContent(content)}`
      }
    }
  }

  createErrorAttentionHint(range: IRange, content: string) {
    return {
      range: new Range(range.startLineNumber, 1, range.startLineNumber, 100),
      options: {
        className: 'attention-hint__error',
        isWholeLine: true,
        afterContentClassName: `attention-hint__error-text ${this.addPseudoElementClassNameWithHashContent(content)}`
      }
    }
  }

  dispose() {
    this.attentionHintDecoration.clear()
    this.abortController.abort()
    super.dispose()
  }
}
