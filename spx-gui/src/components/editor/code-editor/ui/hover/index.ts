import { debounce } from 'lodash'
import Emitter from '@/utils/emitter'
import { TaskManager } from '@/utils/task'
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
import { fromMonacoPosition, supportGoTo } from '../common'

export type Hover = {
  contents: DefinitionDocumentationString[]
  range?: Range
  actions: Action[]
}

export type InternalHover = Hover & {
  range: Range
}

export type HoverContext = BaseContext

type HoverTarget =
  | {
      type: 'text'
      position: Position
    }
  | {
      type: 'hover-card'
    }
  | {
      type: 'other'
    }

export interface IHoverProvider {
  provideHover(ctx: HoverContext, position: Position): Promise<Hover | null>
}

export class HoverController extends Emitter<{
  cardMouseEnter: void
  cardMouseLeave: void
}> {
  private provider: IHoverProvider | null = null

  registerProvider(provider: IHoverProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private hoverMgr = new TaskManager(async (signal, position: Position) => {
    if (this.provider == null) throw new Error('No provider registered')
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')

    const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
    if (diagnosticsHover != null) return diagnosticsHover

    const resourceReferenceHover = this.getResourceReferenceHover(position)
    if (resourceReferenceHover != null) return resourceReferenceHover

    const providedHover = await this.provider.provideHover({ textDocument, signal }, position)
    if (providedHover == null) return null
    const range = providedHover.range ?? textDocument.getDefaultRange(position)
    return { ...providedHover, range }
  })

  get hover() {
    return this.hoverMgr.result.data
  }

  hideHover() {
    this.hoverMgr.stop()
  }

  private getDiagnosticsHover(textDocument: ITextDocument, position: Position): InternalHover | null {
    const diagnosticsController = this.ui.diagnosticsController
    if (diagnosticsController.diagnostics == null) return null
    for (const diagnostic of diagnosticsController.diagnostics) {
      if (!containsPosition(diagnostic.range, position)) continue
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

  private getResourceReferenceHover(position: Position): InternalHover | null {
    const resourceReferenceController = this.ui.resourceReferenceController
    if (resourceReferenceController.items == null) return null
    for (const reference of resourceReferenceController.items) {
      if (!containsPosition(reference.range, position)) continue
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

    const hideHoverWithDebounce = debounce(() => this.hideHover(), 100)

    const handleMouseEnter = debounce((target: HoverTarget) => {
      if (target.type === 'other') {
        hideHoverWithDebounce()
        return
      }
      hideHoverWithDebounce.cancel()
      if (target.type !== 'text') return
      const position = target.position
      const currentHover = this.hover
      if (currentHover != null && containsPosition(currentHover.range, position)) return
      this.hoverMgr.start(position)
    }, 50)

    this.addDisposable(
      editor.onMouseMove((e: monaco.editor.IEditorMouseEvent) => {
        if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          handleMouseEnter({ type: 'other' })
          return
        }
        const position = fromMonacoPosition(e.target.position)
        handleMouseEnter({ type: 'text', position })
      })
    )

    this.addDisposable(editor.onMouseLeave(() => handleMouseEnter({ type: 'other' })))

    this.on('cardMouseEnter', () => handleMouseEnter({ type: 'hover-card' }))
    this.on('cardMouseLeave', () => handleMouseEnter({ type: 'other' }))

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
