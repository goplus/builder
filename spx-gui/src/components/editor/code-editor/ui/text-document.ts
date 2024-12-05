import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { Range, ITextDocument, Position, TextDocumentIdentifier, WordAtPosition } from '../common'
import { toMonacoPosition, toMonacoRange, toMonacoUri, type ICodeOwner, type Monaco, type monaco } from './common'

export class TextDocument extends Disposable implements ITextDocument {
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
    console.warn('TODO', position)
    return 0
  }

  getPositionAt(offset: number): Position {
    console.warn('TODO', offset)
    return { line: 0, column: 0 }
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
