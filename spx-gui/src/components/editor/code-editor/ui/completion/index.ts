import { shallowRef, watch } from 'vue'
import type { editor } from 'monaco-editor'
import { Disposable } from '@/utils/disposable'
import { DefinitionKind, type BaseContext, type DefinitionDocumentationString, type Position } from '../../common'
import type { CodeEditorUI } from '..'
import { fromMonacoPosition } from '../common'

export type CompletionContext = BaseContext

export type CompletionItemKind = DefinitionKind

export type CompletionItem = {
  label: string
  kind: CompletionItemKind
  documentation: DefinitionDocumentationString
}

export interface ICompletionProvider {
  provideCompletion(ctx: CompletionContext, position: Position): Promise<CompletionItem[]>
}

export class CompletionController extends Disposable {
  itemsRef = shallowRef<CompletionItem[] | null>(null)

  private provider: ICompletionProvider | null = null
  registerProvider(provider: ICompletionProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  widgetEl = document.createElement('div')

  private widget: editor.IContentWidget = {
    getId: () => `completion-for-${this.ui.id}`,
    getDomNode: () => this.widgetEl,
    getPosition: () => {
      const monaco = this.ui.monaco
      const cursorPos = this.ui.editor.getPosition()
      return {
        position: cursorPos,
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE
        ]
      }
    }
  }

  init() {
    const { monaco, editor } = this.ui

    this.addDisposable(
      monaco.languages.registerCompletionItemProvider('spx', {
        // disable default completion
        provideCompletionItems: async () => null
      })
    )

    let lastCtrl: AbortController | null

    this.addDisposable(
      editor.onKeyUp(async (e) => {
        if (lastCtrl != null) lastCtrl.abort()
        const ctrl = (lastCtrl = new AbortController())

        if (this.provider == null) return
        const monacoPosition = editor.getPosition()
        if (monacoPosition == null) return
        const textDocument = this.ui.activeTextDocument
        if (textDocument == null) return
        const position = fromMonacoPosition(monacoPosition)
        const currentChar = textDocument.getValueInRange({
          start: {
            line: position.line,
            column: position.column - 1
          },
          end: position
        })

        // TODO: more complex logic & check
        if (e.keyCode < 21 || e.keyCode > 56) return
        if (!/\w/.test(currentChar)) return

        this.itemsRef.value = await this.provider.provideCompletion(
          {
            signal: ctrl.signal,
            textDocument
          },
          position
        )
      })
    )

    this.addDisposer(
      watch(this.itemsRef, (items, _, onCleanup) => {
        if (items == null || items.length === 0) return
        editor.addContentWidget(this.widget)
        onCleanup(() => editor.removeContentWidget(this.widget))
      })
    )

    this.addDisposable(
      editor.onDidChangeCursorPosition(() => {
        this.itemsRef.value = null
      })
    )
  }
}
