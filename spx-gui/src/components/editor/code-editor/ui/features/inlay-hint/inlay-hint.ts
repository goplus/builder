import { type editor as IEditor, type IDisposable, Range } from 'monaco-editor'

export class InlayHint implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  abortController = new AbortController()
  eventDisposeHandler: Array<() => void> = []
  public textDecorationsCollection: IEditor.IEditorDecorationsCollection
  public mouseColumn = 0

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.textDecorationsCollection = editor.createDecorationsCollection([])
    this.editor.onMouseMove((e) => {
      this.mouseColumn = e.target.range?.startColumn || e.target.mouseColumn
    })
  }

  public createParamDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    return {
      range: new Range(line, column, line, column + 1),
      options: {
        before: {
          content: content,
          inlineClassName: 'inlay-hint__param',
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    }
  }

  public createTagDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    return {
      range: new Range(line, column - 1, line, column),
      options: {
        after: {
          content: content,
          inlineClassName: 'inlay-hint__tag',
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    }
  }

  public createIconDecoration(line: number, column: number): IEditor.IModelDeltaDecoration {
    return {
      range: new Range(line, column, line, column + 1),
      options: {
        inlineClassName: 'inlay-hint__icon-playlist',
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  dispose() {
    this.eventDisposeHandler.forEach((dispose) => dispose())

    this.textDecorationsCollection.clear()
    this.abortController.abort()
  }
}
