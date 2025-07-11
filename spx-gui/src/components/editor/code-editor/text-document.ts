import { debounce } from 'lodash'
import { computed, watch, type ComputedRef } from 'vue'
import Emitter from '@/utils/emitter'
import { type Stage } from '@/models/stage'
import type { Action, Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import type { ResourceModelIdentifier } from '@/models/common/resource-model'
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
    private project: Project
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
    return this.project.history.doAction(this.action, () => {
      this.getStage().setCode(newCode)
    })
  }
}

class CodeOwnerSprite implements ICodeOwner {
  private actionComputed: ComputedRef<Action>
  constructor(
    private getSprite: () => Sprite | null,
    private project: Project
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
    return this.project.history.doAction(this.actionComputed.value, () => {
      sprite.setCode(newCode)
    })
  }
}

export function createTextDocument(resourceModelId: ResourceModelIdentifier, project: Project, monaco: Monaco) {
  let codeOwner: ICodeOwner | null = null
  if (resourceModelId.type === 'stage') {
    codeOwner = new CodeOwnerStage(() => project.stage, project)
  } else if (resourceModelId.type === 'sprite') {
    codeOwner = new CodeOwnerSprite(() => project.getResourceModel(resourceModelId) as Sprite | null, project)
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

  /** Kind of the current change */
  private changeKind = CodeChangeKind.User

  /** Set the change kind to programmatic */
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
