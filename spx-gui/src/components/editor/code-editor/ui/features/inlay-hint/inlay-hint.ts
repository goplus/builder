import { type editor as IEditor, type IDisposable, Range } from 'monaco-editor'
import { StyleSheetContent } from '@/components/editor/code-editor/ui/common/style-sheet-content'

export class InlayHint extends StyleSheetContent implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  abortController = new AbortController()
  eventDisposeHandler: Array<() => void> = []
  public textDecorationsCollection: IEditor.IEditorDecorationsCollection
  public mouseColumn = 0

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    super()
    this.editor = editor
    this.textDecorationsCollection = editor.createDecorationsCollection([])
    this.editor.onMouseMove((e) => {
      this.mouseColumn = e.target.range?.startColumn || e.target.mouseColumn
    })

    // todo: trigger completion menu
  }

  public createParamDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    return {
      range: new Range(line, column - 1, line, column),
      options: {
        inlineClassName: `inlay-hint__param ${this.addPseudoElementClassNameWithHashContent(content)}`,
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  public createTagDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    return {
      range: {
        startLineNumber: line,
        endLineNumber: line,
        startColumn: column - 1,
        endColumn: column
      },
      options: {
        inlineClassName: `inlay-hint__tag ${this.addPseudoElementClassNameWithHashContent(content)}`,
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  public createIconDecoration(line: number, column: number): IEditor.IModelDeltaDecoration {
    return {
      range: {
        startLineNumber: 1,
        endLineNumber: line,
        startColumn: column,
        endColumn: column
      },
      options: {
        after: {
          inlineClassName: 'inlay-hint__icon-playlist',
          // must add a word in content property, here use space, otherwise the icon will not be displayed
          content: ' ',
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    }
  }

  dispose() {
    this.eventDisposeHandler.forEach((dispose) => dispose())

    this.textDecorationsCollection.clear()
    this.abortController.abort()
    super.dispose()
  }
}
