import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import {
  type Action,
  type BaseContext,
  type DefinitionDocumentationString,
  type Range,
  type Position
} from '../../common'
import type { CodeEditorUI } from '..'
import { fromMonacoPosition, toMonacoPosition, token2Signal, type monaco } from '../common'

export type Hover = {
  contents: DefinitionDocumentationString[]
  range?: Range
  actions: Action[]
}

export type InternalHover = Hover & {
  range: Range
}

export type HoverContext = BaseContext

export interface IHoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}

export class HoverController extends Disposable {
  currentHoverRef = shallowRef<InternalHover | null>(null)

  private showHover(hover: InternalHover) {
    this.currentHoverRef.value = hover
  }

  private hideHover() {
    this.currentHoverRef.value = null
  }

  private provider: IHoverProvider | null = null

  registerProvider(provider: IHoverProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  widgetEl = document.createElement('div')

  private widget: monaco.editor.IContentWidget = {
    getId: () => `hover-for-${this.ui.id}`,
    getDomNode: () => this.widgetEl,
    getPosition: () => {
      const monaco = this.ui.monaco
      const hover = this.currentHoverRef.value
      return {
        position: hover == null ? null : toMonacoPosition(hover.range.start),
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW
        ]
      }
    }
  }

  init() {
    const { monaco, editor } = this.ui

    this.addDisposable(
      monaco.languages.registerHoverProvider('spx', {
        provideHover: async (_, position, token) => {
          // TODO: use `onMouseMove` as trigger?
          if (this.provider == null) return
          const textDocument = this.ui.activeTextDocument
          if (textDocument == null) throw new Error('No active text document')
          const signal = token2Signal(token)
          const hover = await this.provider.provideHover(
            { textDocument, signal },
            { line: position.lineNumber, column: position.column }
          )
          if (hover == null) return
          const range = hover.range ?? textDocument.getDefaultRange(fromMonacoPosition(position))
          this.showHover({ ...hover, range })
          return null
        }
      })
    )

    this.addDisposer(
      watch(this.currentHoverRef, (hover, _, onCleanup) => {
        if (hover == null) return
        editor.addContentWidget(this.widget)
        onCleanup(() => editor.removeContentWidget(this.widget))
      })
    )

    this.addDisposable(
      editor.onMouseMove((e) => {
        if (
          e.target.type !== monaco.editor.MouseTargetType.CONTENT_WIDGET &&
          e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT
        )
          this.hideHover()
      })
    )

    // TODO: clear hover when switching text document
  }
}
