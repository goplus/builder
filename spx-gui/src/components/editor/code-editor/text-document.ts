import { debounce } from 'lodash'
import { computed, watch, type ComputedRef } from 'vue'
import Emitter from '@/utils/emitter'
import { type Stage } from '@/models/spx/stage'
import type { SpxProject } from '@/models/spx/project'
import type { Action, History } from '@/components/editor/history'
import type { Sprite } from '@/models/spx/sprite'
import type { ResourceModelIdentifier } from '@/models/spx/common/resource-model'
import {
  type Range,
  type ITextDocument,
  type Position,
  type TextDocumentIdentifier,
  type WordAtPosition,
  type TextEdit,
  getTextDocumentId
} from './common'
import { toMonacoPosition, toMonacoRange, fromMonacoPosition, fromMonacoRange } from './ui/common'
import type { Monaco, monaco } from './monaco'

/**
 * Indicates the origin of a text change in `TextDocument`.
 *
 * When Monaco's model content changes (via `onDidChangeContent`), we need to know
 * who initiated the change to decide whether `TextDocument` should record it in history:
 *
 * - `User`: The change comes from direct user interaction with the Monaco editor
 *   (typing, pasting via browser, etc.). In this case, `TextDocument` (via `CodeOwner`)
 *   is responsible for calling `history.doAction` to record the change.
 *
 * - `Program`: The change comes from application code calling `TextDocument` methods
 *   like `pushEdits` or `setValue`. In this case, `TextDocument` does NOT record history.
 *   The **caller** (direct or indirect) is responsible for wrapping the call in
 *   `history.doAction` if the change should be undoable.
 *
 * NOTE: This design has a known limitation. Some callers of `pushEdits` are essentially
 * alternative input methods (e.g., completion, input helper) and should behave like `User`
 * changes (mergeable "Update xxx code" history), while others (e.g., format, apply copilot
 * code change) need distinct, non-mergeable history actions. Currently all `pushEdits` /
 * `setValue` calls use `Program`, forcing every caller to handle history explicitly.
 * A planned improvement (see [#2881](https://github.com/goplus/builder/issues/2881)) will
 * allow callers to control history behavior via a parameter, so that "alternative input" callers
 * get automatic User-like history by default.
 */
enum CodeChangeKind {
  /** User interaction with monaco editor */
  User,
  /** Programmatic change from other parts of the application */
  Program
}

export interface ICodeOwner {
  getTextDocumentId(): TextDocumentIdentifier
  getCode(): string
  setCode(newCode: string, kind: CodeChangeKind): void
}

class CodeOwnerStage implements ICodeOwner {
  private action: Action
  constructor(
    private getStage: () => Stage,
    private history: History
  ) {
    this.action = {
      name: { en: 'Update stage code', zh: '修改舞台代码' },
      mergeable: true
    }
  }
  getTextDocumentId() {
    return getTextDocumentId(this.getStage().codeFilePath)
  }
  getCode() {
    return this.getStage().code
  }
  setCode(newCode: string, kind: CodeChangeKind) {
    if (kind === CodeChangeKind.Program) return this.getStage().setCode(newCode)
    return this.history.doAction(this.action, () => {
      this.getStage().setCode(newCode)
    })
  }
}

class CodeOwnerSprite implements ICodeOwner {
  private actionComputed: ComputedRef<Action>
  constructor(
    private getSprite: () => Sprite | null,
    private history: History
  ) {
    this.actionComputed = computed(() => {
      const name = this.getSprite()?.name ?? 'Sprite'
      return {
        name: { en: `Update ${name} code`, zh: `修改 ${name} 代码` },
        mergeable: true
      }
    })
  }
  getTextDocumentId() {
    const sprite = this.getSprite()
    if (sprite == null) throw new Error('Sprite not found')
    return getTextDocumentId(sprite.codeFilePath)
  }
  getCode() {
    return this.getSprite()?.code ?? ''
  }
  setCode(newCode: string, kind: CodeChangeKind) {
    const sprite = this.getSprite()
    if (sprite == null) throw new Error('Sprite not found')
    if (kind === CodeChangeKind.Program) return sprite.setCode(newCode)
    return this.history.doAction(this.actionComputed.value, () => {
      sprite.setCode(newCode)
    })
  }
}

export function createTextDocument(
  resourceModelId: ResourceModelIdentifier,
  project: SpxProject,
  history: History,
  monaco: Monaco
) {
  let codeOwner: ICodeOwner | null = null
  if (resourceModelId.type === 'stage') {
    codeOwner = new CodeOwnerStage(() => project.stage, history)
  } else if (resourceModelId.type === 'sprite') {
    codeOwner = new CodeOwnerSprite(() => project.getResourceModel(resourceModelId) as Sprite | null, history)
  }
  if (codeOwner == null) throw new Error(`Invalid text document id: ${resourceModelId}`)
  return new TextDocument(codeOwner, monaco)
}

export class TextDocument
  extends Emitter<{
    didChangeContent: string
  }>
  implements ITextDocument
{
  get id() {
    return this.codeOwner.getTextDocumentId()
  }
  monacoTextModel: monaco.editor.ITextModel

  constructor(
    private codeOwner: ICodeOwner,
    monaco: Monaco
  ) {
    super()

    this.monacoTextModel = monaco.editor.createModel(codeOwner.getCode() ?? '', 'spx')

    this.addDisposer(watch(() => codeOwner.getCode(), this.handleCodeOwnerCodeChange))

    this.addDisposable(
      this.monacoTextModel.onDidChangeContent(async () => {
        const newCode = this.monacoTextModel.getValue()
        if (codeOwner.getCode() !== newCode) {
          codeOwner.setCode(newCode, this.changeKind)
        }
        this.emit('didChangeContent', newCode)
      })
    )
  }

  // This is a workaround for IME input issues in Monaco editor.
  // When typing certain characters like Chinese punctuation (`……`, `——`, `"`),
  // the IME often splits input into multiple insertions with small time intervals.
  //
  // Example with `……`:
  // 1. First `…` inserted in Monaco → synced to codeOwner (async)
  // 2. Second `…` inserted in Monaco → synced to codeOwner (async)
  // 3. First sync completes: Monaco: `……`, codeOwner: `…`
  // 4. Second sync completes: Monaco: `……`, codeOwner: `……`
  //
  // The problem: Step 3 causes Monaco to reset with `monacoTextModel.setValue()`,
  // resulting in cursor jumps and other disruptions.
  //
  // Solution: Debounce the syncing from codeOwner to Monaco so both insertions are processed
  // together, avoiding unnecessary model resets.
  // TODO: Find a better solution to this problem.
  private handleCodeOwnerCodeChange = debounce(() => {
    const newCode = this.codeOwner.getCode()
    if (newCode == null || this.monacoTextModel.getValue() === newCode) return
    this.monacoTextModel.setValue(newCode)
  }, 100)

  /**
   * Kind of the current change. Defaults to `User` so that changes from
   * direct Monaco interactions (typing, etc.) are automatically recorded
   * in history by `CodeOwner.setCode`. Methods like `pushEdits` and
   * `setValue` temporarily switch this to `Program` via
   * `withChangeKindProgram`, delegating history responsibility to the caller.
   */
  private changeKind = CodeChangeKind.User

  /**
   * Temporarily set `changeKind` to `Program` while executing `fn`.
   * Any Monaco model change triggered within `fn` will be treated as a
   * programmatic change, so `CodeOwner.setCode` will skip `history.doAction`.
   * The caller of the public method (e.g., `pushEdits`, `setValue`) is
   * responsible for wrapping the call in `history.doAction` if needed.
   */
  private withChangeKindProgram(fn: () => void) {
    const original = this.changeKind
    this.changeKind = CodeChangeKind.Program
    try {
      fn()
    } finally {
      this.changeKind = original
    }
  }

  getValue() {
    return this.monacoTextModel.getValue()
  }

  /**
   * Replace the entire text model value programmatically.
   * History is NOT recorded here — the caller is responsible for wrapping
   * this call in `history.doAction` if the change should be undoable.
   */
  setValue(newValue: string) {
    this.withChangeKindProgram(() => {
      this.monacoTextModel.setValue(newValue)
    })
  }

  getOffsetAt(position: Position): number {
    return this.monacoTextModel.getOffsetAt(toMonacoPosition(position))
  }

  getPositionAt(offset: number): Position {
    return fromMonacoPosition(this.monacoTextModel.getPositionAt(offset))
  }

  getValueInRange(range: Range): string {
    return this.monacoTextModel.getValueInRange(toMonacoRange(range))
  }

  getLineContent(line: number): string {
    return this.monacoTextModel.getLineContent(line)
  }

  getWordAtPosition(position: Position): WordAtPosition | null {
    return this.monacoTextModel.getWordAtPosition(toMonacoPosition(position))
  }

  getDefaultRange(position: Position): Range {
    const word = this.getWordAtPosition(position)
    if (word == null) return { start: position, end: position }
    return {
      start: { line: position.line, column: word.startColumn },
      end: { line: position.line, column: word.endColumn }
    }
  }

  getFullRange(): Range {
    return fromMonacoRange(this.monacoTextModel.getFullModelRange())
  }

  /**
   * Apply edits to the Monaco text model programmatically.
   * History is NOT recorded here — the caller is responsible for wrapping
   * this call in `history.doAction` if the edits should be undoable.
   */
  pushEdits(edits: TextEdit[]): void {
    this.withChangeKindProgram(() => {
      this.monacoTextModel.pushEditOperations(
        null,
        edits.map((edit) => ({
          range: toMonacoRange(edit.range),
          text: edit.newText
        })),
        () => null
      )
    })
  }
}
