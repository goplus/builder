import { debounce } from 'lodash'
import { escapeHTML } from '@/utils/utils'
import Emitter from '@/utils/emitter'
import { TaskManager } from '@/utils/task'
import { createCodeEditorOperationName, defineIdleTransaction } from '@/utils/tracing'
import {
  type Action,
  type BaseContext,
  type DefinitionDocumentationString,
  type Range,
  type Position,
  makeBasicMarkdownString,
  getResourceModel,
  type ITextDocument,
  containsPosition,
  InputKind,
  rangeEq
} from '../../common'
import type { monaco } from '../../monaco'
import {
  builtInCommandCopilotFixProblem,
  builtInCommandGoToResource,
  type CodeEditorUI,
  builtInCommandRenameResource,
  builtInCommandInvokeInputHelper
} from '../code-editor-ui'
import { fromMonacoPosition } from '../common'
import { hasPreviewForInputType } from '../markdown/InputValuePreview.vue'

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
    if (this.provider == null) return null
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null

    const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
    if (diagnosticsHover != null) return diagnosticsHover

    const providedHover = await this.provider.provideHover({ textDocument, signal }, position)
    let providedInternalHover: InternalHover | null = null
    if (providedHover != null) {
      const range = providedHover.range ?? textDocument.getDefaultRange(position)
      providedInternalHover = { ...providedHover, range }
    }
    const resourceReferenceHover = this.getResourceReferenceHover(position)
    const inputHelperHover = this.getInputHelperHover(position)

    let hover: InternalHover | null = null
    ;[
      // These three items from high priority to low priority are checked in order:
      // * Contents from higher-priority item will be used
      // * Actions from all items (with the same range) will be merged
      inputHelperHover,
      resourceReferenceHover,
      providedInternalHover
    ].forEach((hoverItem) => {
      if (hoverItem == null) return
      if (hover == null) {
        hover = {
          contents: [],
          range: hoverItem.range,
          actions: []
        }
      }
      if (!rangeEq(hoverItem.range, hover.range)) return
      if (hover.contents.length === 0) hover.contents = hoverItem.contents
      hover.actions.push(...hoverItem.actions)
    })

    return hover
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
            `<pre is="diagnostic-item" severity="${diagnostic.severity}">${diagnostic.message}</pre>`
          )
        ],
        range: diagnostic.range,
        actions: [
          {
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
      if (resourceModel != null) {
        actions.push({
          command: builtInCommandGoToResource,
          arguments: [reference.resource]
        })
      }
      actions.push({
        command: builtInCommandRenameResource,
        arguments: [reference.resource]
      })
      return {
        contents: [],
        range: reference.range,
        actions
      }
    }
    return null
  }

  private getInputHelperHover(position: Position): InternalHover | null {
    const inputHelperController = this.ui.inputHelperController
    if (inputHelperController.slots == null) return null
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null
    for (const item of inputHelperController.slots) {
      if (!containsPosition(item.range, position)) continue
      const input = item.input
      const contents: DefinitionDocumentationString[] = []
      if (input.kind === InputKind.InPlace && hasPreviewForInputType(input.type)) {
        // Preview for in-place inputs only
        contents.push(makeBasicMarkdownString(`<input-value-preview input="${escapeHTML(JSON.stringify(input))}" />`))
      }
      return {
        contents,
        range: item.range,
        actions: [
          {
            command: builtInCommandInvokeInputHelper,
            arguments: [item]
          }
        ]
      }
    }
    return null
  }

  init() {
    const { monaco, editor, resourceReferenceController } = this.ui

    const hideHoverWithDebounce = debounce(() => this.hideHover(), 100)

    const startCodeHoveredTransaction = defineIdleTransaction({
      startSpanOptions: {
        name: createCodeEditorOperationName('Code hovered'),
        op: 'code-editor.hover'
      }
    })

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

      // Do not trigger hover when input helper is active
      if (this.ui.inputHelperController.inputingSlot != null) return

      startCodeHoveredTransaction()
      this.hoverMgr.start(position)
    }, 50)

    this.addDisposable(
      editor.onMouseMove((e: monaco.editor.IEditorMouseEvent) => {
        if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          handleMouseEnter({ type: 'other' })
          return
        }
        if (e.target.range.isEmpty()) {
          // target with type `CONTENT_TEXT` & empty range stands for special contents, like decorations
          handleMouseEnter({ type: 'other' })
          return
        }
        // Here we use start position of `e.target.range` instead of `e.target.position`, as hovering happens on one character instead of between two characters.
        // And `e.target.position` stands for the gap between two characters while `e.target.range` represents the hovered character.
        // For example with text `ab`:
        // * When the mouse is over the second half of `a`:
        //   - `e.target.position` will be `{ column: 2 }`
        //   - `e.target.range` will be `{ startColumn: 1, endColumn: 2 }`
        // * When the mouse is over the first half of `b`:
        //   - `e.target.position` will be `{ column: 2 }`
        //   - `e.target.range` will be `{ startColumn: 2, endColumn: 3 }`
        const position = fromMonacoPosition({
          lineNumber: e.target.range.startLineNumber,
          column: e.target.range.startColumn
        })
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
  }
}
