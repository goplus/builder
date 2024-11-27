import { shallowRef, watch } from 'vue'
import type { editor } from 'monaco-editor'
import { Disposable } from '@/utils/disposable'
import {
  type Action,
  type BaseContext,
  type DefinitionDocumentationString,
  type IRange,
  type Position
} from '../../common'
import type { CodeEditorUI } from '..'
import { fromMonacoPosition, fromMonacoTextModelUri, toMonacoPosition, token2Signal } from '../common'

export type Hover = {
  contents: DefinitionDocumentationString[]
  range?: IRange
  actions: Action[]
}

export type InternalHover = Hover & {
  range: IRange
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

  private widget: editor.IContentWidget = {
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
        provideHover: async (model, position, token) => {
          // TODO: use `onMouseMove` as trigger?
          if (this.provider == null) return
          const textDocument = this.ui.getTextDocument(fromMonacoTextModelUri(model.uri))
          if (textDocument == null) throw new Error('Text document not found')
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
  }
}
