import { type editor as IEditor, type IDisposable, Range } from 'monaco-editor'
import { EditorUI } from '@/components/editor/code-editor/EditorUI'

export class InlayHint implements IDisposable {
  editor: IEditor.IStandaloneCodeEditor
  editorUI: EditorUI
  styleElement: HTMLStyleElement
  styleMap: Map<string, string>
  abortController = new AbortController()
  textDecorationsCollection: IEditor.IEditorDecorationsCollection

  constructor(editor: IEditor.IStandaloneCodeEditor, ui: EditorUI) {
    this.editor = editor
    this.editorUI = ui
    this.styleElement = document.createElement('style')
    this.styleMap = new Map()
    this.textDecorationsCollection = editor.createDecorationsCollection([])
    document.head.appendChild(this.styleElement)

    this.editor.onDidChangeModelContent(() => {
      void this.updateInlayHint()
    })

    // todo: trigger completion menu
  }

  public async updateInlayHint() {
    const model = this.editor.getModel()
    if (!model) return
    this.abortController.abort()
    this.abortController = new AbortController()
    const inlayHints = await this.editorUI.requestInlayHintProviderResolve(model, {
      signal: this.abortController.signal
    })

    this.textDecorationsCollection.clear()
    this.textDecorationsCollection.set(
      inlayHints
        .filter(
          (inlayHint) =>
            // filter special param like playlist icon param
            !(typeof inlayHint.content === 'string' && ['mediaName'].includes(inlayHint.content))
        )
        .map((inlayHint): IEditor.IModelDeltaDecoration => {
          if (typeof inlayHint.content === 'string') {
            return this.createParamDecoration(
              inlayHint.position.lineNumber,
              inlayHint.position.column,
              inlayHint.content + ':'
            )
          } else {
            return this.createIconDecoration(
              inlayHint.position.lineNumber,
              inlayHint.position.column
            )
          }
        })
    )
  }

  createParamDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    const contentClassname = `inlay-hint__content-${this.hash(content)}`
    const className = 'inlay-hint__param ' + contentClassname

    this.addStyle(contentClassname, content)
    return {
      range: new Range(line, column - 1, line, column),
      options: {
        inlineClassName: className,
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  createTagDecoration(
    line: number,
    column: number,
    content: string
  ): IEditor.IModelDeltaDecoration {
    const contentClassname = `inlay-hint__content-${this.hash(content)}`
    const className = 'inlay-hint__tag'
    this.addStyle(contentClassname, content)
    return {
      range: {
        startLineNumber: line,
        endLineNumber: line,
        startColumn: column - 1,
        endColumn: column
      },
      options: {
        inlineClassName: className,
        inlineClassNameAffectsLetterSpacing: true
      }
    }
  }

  createIconDecoration(line: number, column: number): IEditor.IModelDeltaDecoration {
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
