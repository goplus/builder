import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import {
  type Action,
  type BaseContext,
  type DefinitionDocumentationString,
  type Range,
  type Position,
  makeBasicMarkdownString
} from '../../common'
import { builtInCommandCopilotFixProblem, type CodeEditorUI } from '..'
import {
  fromMonacoPosition,
  toMonacoPosition,
  token2Signal,
  type monaco,
  isSelectionEmpty,
  containsPosition
} from '../common'
import type { TextDocument } from '../text-document'
import { makeContentWidgetEl } from '../CodeEditorUI.vue'

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

  hideHover() {
    this.currentHoverRef.value = null
  }

  private provider: IHoverProvider | null = null

  registerProvider(provider: IHoverProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  widgetEl = makeContentWidgetEl()

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

  private getDiagnosticsHover(textDocument: TextDocument, position: monaco.Position): InternalHover | null {
    const diagnosticsController = this.ui.diagnosticsController
    if (diagnosticsController.diagnostics == null) return null
    for (const diagnostic of diagnosticsController.diagnostics) {
      if (!containsPosition(diagnostic.range, fromMonacoPosition(position))) continue
      return {
        contents: [makeBasicMarkdownString(diagnostic.message)],
        range: diagnostic.range,
        actions: [
          {
            title: 'Fix',
            command: builtInCommandCopilotFixProblem,
            arguments: [
              {
                textDocument: textDocument.id,
                problem: diagnostic
              }
            ]
          }
        ]
      }
    }
    return null
  }

  init() {
    const { monaco, editor } = this.ui

    this.addDisposable(
      monaco.languages.registerHoverProvider('spx', {
        provideHover: async (_, position, token) => {
          this.hideHover()

          // TODO: use `onMouseMove` as trigger?
          if (this.provider == null) return
          const textDocument = this.ui.activeTextDocument
          if (textDocument == null) throw new Error('No active text document')
          if (!isSelectionEmpty(this.ui.selection)) return

          const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
          if (diagnosticsHover != null) {
            // TODO: merge with hover from provider?
            this.showHover(diagnosticsHover)
            return null
          }

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
