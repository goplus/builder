import { watch } from 'vue'
import Emitter from '@/utils/emitter'
import type { Range, ITextDocument, Position, TextDocumentIdentifier, WordAtPosition } from '../common'
import {
  toMonacoPosition,
  toMonacoRange,
  toMonacoUri,
  type ICodeOwner,
  type Monaco,
  type monaco,
  fromMonacoPosition
} from './common'

export class TextDocument
  extends Emitter<{
    didChangeContent: string
  }>
  implements ITextDocument
{
  id: TextDocumentIdentifier
  monacoTextModel: monaco.editor.ITextModel

  constructor(codeOwner: ICodeOwner, monaco: Monaco) {
    super()

    this.id = codeOwner.getTextDocumentId()

    const monacoUri = toMonacoUri(this.id, monaco)
    this.monacoTextModel =
      monaco.editor.getModel(monacoUri) ?? monaco.editor.createModel(codeOwner.getCode(), 'spx', monacoUri)

    this.addDisposer(
      watch(
        () => codeOwner.getCode(),
        (newCode) => {
          if (this.monacoTextModel.getValue() === newCode) return
          this.monacoTextModel.setValue(newCode)
        }
      )
    )

    this.addDisposable(
      this.monacoTextModel.onDidChangeContent(() => {
        const newCode = this.monacoTextModel.getValue()
        this.emit('didChangeContent', newCode)
        if (codeOwner.getCode() === newCode) return
        codeOwner.setCode(newCode)
      })
    )
  }

  getValue() {
    return this.monacoTextModel.getValue()
  }

  setValue(newValue: string) {
    this.monacoTextModel.setValue(newValue)
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
}
