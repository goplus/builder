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
import type { InlayHintItem } from '../../inlay-hint'

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

type TextHover = Hover & {
  range: Range
}

export type InternalHover =
  | TextHover
  | (Omit<Hover, 'range'> & {
      range: null
      anchorRect: DOMRect
      inlayHint: InlayHintItem
    })

type HoverRequest =
  | {
      type: 'text'
      position: Position
    }
  | {
      type: 'inlay-hint'
      item: InlayHintItem
      anchorRect: DOMRect
    }

type HoverTarget =
  | HoverRequest
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

  private hoverMgr = new TaskManager(async (signal, target: HoverRequest): Promise<InternalHover | null> => {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null
    if (target.type === 'inlay-hint') {
      const { tooltip } = target.item
      if (tooltip == null) return null
      return {
        contents: [tooltip],
        range: null,
        anchorRect: target.anchorRect,
        inlayHint: target.item,
        actions: []
      }
    }

    const provider = this.ui.codeEditor.hoverProvider
    const position = target.position
    const diagnosticsHover = this.getDiagnosticsHover(textDocument, position)
    const providedHover = await provider.provideHover({ textDocument, signal }, position)
    let providedTextHover: TextHover | null = null
    if (providedHover != null) {
      const range = providedHover.range ?? textDocument.getDefaultRange(position)
      providedTextHover = { ...providedHover, range }
    }
    const resourceReferenceHover = this.getResourceReferenceHover(position)
    const inputHelperHover = this.getInputHelperHover(position)

    let hover: TextHover | null = null
    for (const hoverItem of [
      // These three items from high priority to low priority are checked in order:
      // * Contents from higher-priority item will be used
      // * Actions from all items (with the same range) will be merged
      inputHelperHover,
      resourceReferenceHover,
      providedTextHover
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

  private hasHoverFor(target: HoverRequest) {
    const hover = this.hover
    if (hover == null) return false

    if (target.type === 'inlay-hint') {
      return hover.range == null && hover.inlayHint === target.item
    }
    return hover.range != null && containsPosition(hover.range, target.position)
  }

  private getDiagnosticsHover(textDocument: ITextDocument, position: Position): TextHover | null {
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

  private getResourceReferenceHover(position: Position): TextHover | null {
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

  private getInputHelperHover(position: Position): TextHover | null {
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
    const { monaco, editor, resourceReferenceController, inlayHintController } = this.ui

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
      if (target.type === 'hover-card') return
      if (this.hasHoverFor(target)) return

      // Do not trigger hover when input helper is active
      if (this.ui.inputHelperController.inputingSlot != null) return

      startCodeHoveredTransaction()
      this.hoverMgr.start(target)
    }, 50)

    /** Handle mouse move event in Monaco editor. */
    function handleEditorMouseMove(target: monaco.editor.IMouseTarget) {
      if (target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
        handleMouseEnter({ type: 'other' })
        return
      }
      if (target.detail.mightBeForeignElement) {
        const attachedData = target.detail.injectedText?.options.attachedData
        const item = inlayHintController.items?.find((item) => item === attachedData)
        if (item?.tooltip == null || target.element == null) {
          handleMouseEnter({ type: 'other' })
          return
        }
        handleMouseEnter({
          type: 'inlay-hint',
          item,
          anchorRect: target.element.getBoundingClientRect()
        })
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

    const editorDomNode = editor.getDomNode()
    if (editorDomNode == null) throw new Error('editor dom node expected')
    // Monaco's mouseLeave fire incorrectly in shadow DOM, so use the editor DOM node's native mouseleave instead.
    editorDomNode.addEventListener('mouseleave', () => handleMouseEnter({ type: 'other' }), {
      signal: this.getSignal()
    })

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
