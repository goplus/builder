import { editor as IEditor, type IDisposable, type IRange, Range } from 'monaco-editor'
import { StyleSheetContent } from '@/components/editor/code-editor/ui/common/style-sheet-content'
import type { AttentionHintDecoration } from '@/components/editor/code-editor/EditorUI'

export class AttentionHint extends StyleSheetContent implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  attentionHintDecoration: IEditor.IEditorDecorationsCollection
  attentionHintDecorations: AttentionHintDecoration[] = []
  abortController = new AbortController()

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    super()
    this.editor = editor
    this.attentionHintDecoration = this.editor.createDecorationsCollection()
  }

  public setAttentionHintDecorations(attentionHintDecorations: AttentionHintDecoration[]) {
    this.attentionHintDecorations = attentionHintDecorations
  }

  public createWarningAttentionHint(range: IRange, content: string) {
    return {
      range: new Range(range.startLineNumber, 1, range.startLineNumber, 1),
      options: {
        className: 'attention-hint__warning',
        isWholeLine: true,
        afterContentClassName: `attention-hint__warning-text ${this.addPseudoElementClassNameWithHashContent(content)}`
      }
    }
  }

  public createErrorAttentionHint(range: IRange, content: string) {
    return {
      range: new Range(range.startLineNumber, 1, range.startLineNumber, 1),
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
    this.attentionHintDecorations = []
    super.dispose()
  }
}
