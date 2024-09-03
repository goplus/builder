import { type editor as IEditor, type IDisposable, Range } from 'monaco-editor'

export class InlayHint implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  styleElement: HTMLStyleElement
  styleMap: Map<string, string>
  abortController = new AbortController()
  public textDecorationsCollection: IEditor.IEditorDecorationsCollection
  public mouseColumn = 0

  constructor(editor: IEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.styleElement = document.createElement('style')
    this.styleMap = new Map()
    this.textDecorationsCollection = editor.createDecorationsCollection([])
    document.head.appendChild(this.styleElement)
    this.editor.onMouseMove((e) => {
      this.mouseColumn = e.target.mouseColumn
    })

    // todo: trigger completion menu
  }

  public createParamDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    const contentClassName = `inlay-hint__content-${this.hash(content)}`

    this.addStyle(contentClassName, content)
    return {
      range: new Range(line, column - 1, line, column),
      options: {
        inlineClassName: `inlay-hint__param ${contentClassName}`,
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  public createTagDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    const contentClassName = `inlay-hint__content-${this.hash(content)}`
    this.addStyle(contentClassName, content)
    return {
      range: {
        startLineNumber: line,
        endLineNumber: line,
        startColumn: column - 1,
        endColumn: column
      },
      options: {
        inlineClassName: `inlay-hint__tag ${contentClassName}`,
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

  addStyle(className: string, content: string) {
    if (!this.styleMap.has(className)) {
      const css = `.${className}::after { content: "${content}"; }`
      this.styleElement.appendChild(document.createTextNode(css))
      this.styleMap.set(className, css)
    }
  }

  hash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0 // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  dispose() {
    this.textDecorationsCollection.clear()
    this.abortController.abort()
    this.styleElement.remove()
    this.styleMap.clear()
  }
}
