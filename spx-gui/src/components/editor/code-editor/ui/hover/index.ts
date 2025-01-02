import { shallowRef } from 'vue'
import Emitter from '@/utils/emitter'
import {
  type Action,
  type BaseContext,
  type DefinitionDocumentationString,
  type Range,
  type Position,
  makeBasicMarkdownString,
  getResourceModel,
  type ITextDocument,
  containsPosition
} from '../../common'
import type { monaco } from '../../monaco'
import {
  builtInCommandCopilotFixProblem,
  builtInCommandGoToResource,
  isModifiableKind,
  type CodeEditorUI,
  builtInCommandModifyResourceReference,
  builtInCommandRenameResource
} from '../code-editor-ui'
import { fromMonacoPosition, token2Signal, supportGoTo } from '../common'

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

export class HoverController extends Emitter<{
  cardMouseEnter: void
  cardMouseLeave: void
}> {
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

  /** `toHide` records the hover that is "planned" to be hiden, while with delay */
  private toHide: InternalHover | null = null

  /** Hide current hover with delay, to avoid flickering when mouse moves quickly */
  private hideHoverWithDelay() {
    const currentHover = this.currentHoverRef.value
    if (currentHover == null) return
    this.toHide = currentHover
    setTimeout(() => {
      if (this.currentHoverRef.value === this.toHide) {
        this.hideHover()
      }
    }, 150)
  }

  /** Cancel "planned" hiding */
  private cancelHidingHover() {
    this.toHide = null
  }

  private getDiagnosticsHover(textDocument: ITextDocument, position: monaco.Position): InternalHover | null {
    const diagnosticsController = this.ui.diagnosticsController
    if (diagnosticsController.diagnostics == null) return null
    for (const diagnostic of diagnosticsController.diagnostics) {
      if (!containsPosition(diagnostic.range, fromMonacoPosition(position))) continue
      return {
        contents: [
          makeBasicMarkdownString(
            `<diagnostic-item severity="${diagnostic.severity}">${diagnostic.message}</diagnostic-item>`
          )
        ],
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

  private getResourceReferenceHover(textDocument: ITextDocument, position: monaco.Position): InternalHover | null {
    const resourceReferenceController = this.ui.resourceReferenceController
    if (resourceReferenceController.items == null) return null
    for (const reference of resourceReferenceController.items) {
      if (!containsPosition(reference.range, fromMonacoPosition(position))) continue
      const actions: Action[] = []
      const resourceModel = getResourceModel(this.ui.project, reference.resource)
      if (resourceModel != null && supportGoTo(resourceModel)) {
        actions.push({
          command: builtInCommandGoToResource,
          arguments: [reference.resource]
        })
      }
      if (isModifiableKind(reference.kind)) {
        actions.push({
          command: builtInCommandModifyResourceReference,
          arguments: [reference]
        })
      }
      actions.push({
        command: builtInCommandRenameResource,
        arguments: [reference.resource]
      })
      return {
        contents: [makeBasicMarkdownString(`<resource-preview resource="${reference.resource.uri}" />`)],
        range: reference.range,
        actions
      }
    }
    return null
  }

  init() {
    const { monaco, editor, resourceReferenceController } = this.ui

    this.addDisposable(
      monaco.languages.registerHoverProvider('spx', {
        provideHover: async (_, position, token) => {
          // TODO: use `onMouseMove` as trigger?
          if (this.provider == null) return
          const textDocument = this.ui.activeTextDocument
          if (textDocument == null) throw new Error('No active text document')

          const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
          if (diagnosticsHover != null) {
            this.showHover(diagnosticsHover)
            return null
          }

          const resourceReferenceHover = this.getResourceReferenceHover(textDocument, position)
          if (resourceReferenceHover != null) {
            this.showHover(resourceReferenceHover)
            return null
          }

          const signal = token2Signal(token)
          const providedHover = await this.provider.provideHover(
            { textDocument, signal },
            { line: position.lineNumber, column: position.column }
          )
          if (providedHover != null) {
            this.showHover({
              ...providedHover,
              range: providedHover.range ?? textDocument.getDefaultRange(fromMonacoPosition(position))
            })
            return null
          }

          return null
        }
      })
    )

    this.addDisposable(
      editor.onMouseMove((e: monaco.editor.IEditorMouseEvent) => {
        if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          this.hideHoverWithDelay()
          return
        }
        const currentHover = this.currentHoverRef.value
        const position = fromMonacoPosition(e.target.position)
        if (currentHover != null && containsPosition(currentHover.range, position)) {
          this.cancelHidingHover()
          return
        }
        this.hideHoverWithDelay()
      })
    )

    this.addDisposable(
      editor.onMouseLeave(() => {
        this.hideHoverWithDelay()
      })
    )

    this.on('cardMouseEnter', () => this.cancelHidingHover())
    this.on('cardMouseLeave', () => this.hideHoverWithDelay())

    this.addDisposable(editor.onKeyDown(() => this.hideHover()))
    this.addDisposable(editor.onMouseDown(() => this.hideHover()))

    this.addDisposer(
      resourceReferenceController.on('didStartModifying', () => {
        this.hideHover()
      })
    )

    // TODO: clear hover when switching text document
  }
}
