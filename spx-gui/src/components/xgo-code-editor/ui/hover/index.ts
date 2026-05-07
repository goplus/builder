import { debounce } from 'lodash'
import { escapeHTML } from '@/utils/utils'
import Emitter from '@/utils/emitter'
import { TaskManager } from '@/utils/task'
import { createCodeEditorOperationName, defineIdleTransaction } from '@/utils/tracing'
import {
  type Action,
  type DefinitionDocumentationString,
  type Range,
  type Position,
  makeBasicMarkdownString,
  type ITextDocument,
  containsPosition,
  InputKind,
  rangeEq
} from '../../common'
import type { monaco } from '../../monaco'
import type { Hover } from '../../hover'

export type { Hover, HoverContext, IHoverProvider } from '../../hover'
import {
  builtInCommandCopilotFixProblem,
  builtInCommandGoToResource,
  type CodeEditorUIController,
  builtInCommandRenameResource,
  builtInCommandInvokeInputHelper
} from '../code-editor-ui'
import { fromMonacoPosition } from '../common'
import { hasPreviewForInputType } from '../markdown/InputValuePreview.vue'

export type InternalHover = Hover & {
  range: Range
}

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

export class HoverController extends Emitter<{
  cardMouseEnter: MouseEvent
  cardMouseLeave: MouseEvent
}> {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private hoverMgr = new TaskManager(async (signal, position: Position) => {
    const provider = this.ui.codeEditor.hoverProvider
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null

    const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
    const providedHover = await provider.provideHover({ textDocument, signal }, position)
    let providedInternalHover: InternalHover | null = null
    if (providedHover != null) {
      const range = providedHover.range ?? textDocument.getDefaultRange(position)
      providedInternalHover = { ...providedHover, range }
    }
    const resourceReferenceHover = this.getResourceReferenceHover(position)
    const inputHelperHover = this.getInputHelperHover(position)

    let hover: InternalHover | null = null
    for (const hoverItem of [
      // These three items from high priority to low priority are checked in order:
      // * Contents from higher-priority item will be used
      // * Actions from all items (with the same range) will be merged
      inputHelperHover,
      resourceReferenceHover,
      providedInternalHover
    ]) {
      if (hoverItem == null) continue
      if (hover == null) {
        hover = {
          contents: [],
          range: hoverItem.range,
          actions: []
        }
      }
      if (!rangeEq(hoverItem.range, hover.range)) continue
      if (hover.contents.length === 0) hover.contents = [...hoverItem.contents]
      hover.actions.push(...hoverItem.actions)
    }

    if (diagnosticsHover != null) {
      if (hover == null) return diagnosticsHover
      // Show diagnostics after the main hover content, but keep its action first as it is usually higher priority.
      hover.contents.push(...diagnosticsHover.contents)
      hover.actions.unshift(...diagnosticsHover.actions)
    }

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
      actions.push({
        command: builtInCommandGoToResource,
        arguments: [reference.resource]
      })
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
      if (input.kind === InputKind.InPlace && hasPreviewForInputType(input.type, inputHelperController.provider)) {
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

    /** Handle mouse move event in Monaco editor. */
    function handleEditorMouseMove(target: monaco.editor.IMouseTarget) {
      if (target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
        handleMouseEnter({ type: 'other' })
        return
      }
      if (target.detail.mightBeForeignElement) {
        // `mightBeForeignElement` indicates injected or foreign content like inlay hint decorations.
        handleMouseEnter({ type: 'other' })
        return
      }
      // Here we use start position of `target.range` instead of `target.position`, as hovering happens on one character instead of between two characters.
      // And `target.position` stands for the gap between two characters while `target.range` represents the hovered character.
      // For example with text `ab`:
      // * When the mouse is over the second half of `a`:
      //   - `target.position` will be `{ column: 2 }`
      //   - `target.range` will be `{ startColumn: 1, endColumn: 2 }`
      // * When the mouse is over the first half of `b`:
      //   - `target.position` will be `{ column: 2 }`
      //   - `target.range` will be `{ startColumn: 2, endColumn: 3 }`
      const position = fromMonacoPosition({
        lineNumber: target.range.startLineNumber,
        column: target.range.startColumn
      })
      handleMouseEnter({ type: 'text', position })
    }

    this.addDisposable(editor.onMouseMove((e) => handleEditorMouseMove(e.target)))
    this.addDisposable(editor.onMouseLeave(() => handleMouseEnter({ type: 'other' })))

    this.on('cardMouseEnter', () => handleMouseEnter({ type: 'hover-card' }))
    this.on('cardMouseLeave', (e) => {
      const target = editor.getTargetAtClientPoint(e.clientX, e.clientY)
      if (target != null) {
        // This handles a timing edge case caused by hover-card reflow.
        //
        // The pointer may start on hoverable text, which shows a hover card above it. If the card
        // content grows afterward, the card can temporarily expand downward and cover the pointer.
        // Monaco then thinks the pointer has left the editor and fires `mouseLeave`, followed by
        // `cardMouseEnter` because the pointer is now over the card. Once UIDropdown repositions the
        // card, the pointer is no longer over it, so `cardMouseLeave` fires.
        //
        // At that point Monaco still has not observed any new pointer movement, so it does not emit
        // `mouseMove` again. If we simply close the hover here, the result is wrong: the pointer is
        // still resting on the original hoverable text.
        //
        // To recover, when `cardMouseLeave` fires and the pointer is still inside the editor, we
        // synthesize the equivalent `mouseMove` handling once more. That lets us detect that the
        // pointer is back over hoverable text and keep the hover card open.
        handleEditorMouseMove(target)
      } else {
        handleMouseEnter({ type: 'other' })
      }
    })

    this.addDisposable(editor.onKeyDown(() => this.hideHover()))
    this.addDisposable(editor.onMouseDown(() => this.hideHover()))

    this.addDisposer(
      resourceReferenceController.on('didStartModifying', () => {
        this.hideHover()
      })
    )
  }
}
