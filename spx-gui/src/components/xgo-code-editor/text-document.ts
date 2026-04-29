/**
 * @desc ICodeOwner interface and TextDocument class — the core text document abstraction.
 * No spx-specific knowledge should be imported here.
 */

import { debounce } from 'lodash'
import { watch } from 'vue'
import Emitter from '@/utils/emitter'
import type { LocaleMessage } from '@/utils/i18n'
import type { File } from '@/models/common/file'
import {
  type Range,
  type ITextDocument,
  type Position,
  type TextDocumentIdentifier,
  type WordAtPosition,
  type TextEdit
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
export enum CodeChangeKind {
  /** User interaction with monaco editor */
  User,
  /** Programmatic change from other parts of the application */
  Program
}

/**
 * Represents an entity that owns a code file.
 * Text documents in the Code Editor correspond directly to code owners.
 */
export interface ICodeOwner {
  /**
   * Stable identifier (e.g. UUID) that persists across renames.
   * Used as the map key for TextDocuments so that the same TextDocument instance
   * is reused even when the code file is renamed.
   */
  id: string
  /** Display name, e.g. "Stage", "Kai" */
  name: string | LocaleMessage
  /** Localized display name for UI labels */
  displayName?: LocaleMessage
  /** Thumbnail file for UI display (e.g. costume or backdrop image) */
  thumbnailFile?: File | null
  /** Get the text document identifier for this code owner's file */
  getTextDocumentId(): TextDocumentIdentifier
  /** Get the current code content */
  getCode(): string
  /** Set the code content with the given change kind */
  setCode(newCode: string, kind: CodeChangeKind): void
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

  get displayName(): LocaleMessage {
    const raw = this.codeOwner.displayName ?? this.codeOwner.name
    if (typeof raw === 'string') return { en: raw, zh: raw }
    return raw
  }

  get thumbnailFile(): File | null {
    return this.codeOwner.thumbnailFile ?? null
  }

  constructor(
    private readonly codeOwner: ICodeOwner,
    monaco: Monaco
  ) {
    super()

    this.monacoTextModel = monaco.editor.createModel(codeOwner.getCode() ?? '', 'xgo')

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
