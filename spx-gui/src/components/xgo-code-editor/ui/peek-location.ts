import { shallowRef } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { Range, TextDocumentRange } from '../common'
import type { TextDocument } from '../text-document'
import type { Monaco } from '../monaco'
import { fromMonacoRange, toMonacoRange } from './common'

/** Keep navigation anchors valid when edits insert or remove lines above them. */
export class PeekLocation extends Disposable {
  private rangeRef = shallowRef<Range>()
  private decorationId: string
  get range() {
    // Read the model as well as the reactive value: another content listener may run first.
    const fallback = this.rangeRef.value!
    const tracked = this.textDocument.monacoTextModel.getDecorationRange(this.decorationId)
    return tracked == null ? fallback : fromMonacoRange(tracked)
  }

  constructor(
    readonly textDocument: TextDocument,
    range: Range,
    monaco: Monaco,
    growAtEdges = false
  ) {
    super()
    this.rangeRef.value = range
    const model = textDocument.monacoTextModel
    const ids = model.deltaDecorations(
      [],
      [
        {
          range: toMonacoRange(range),
          options: {
            stickiness: growAtEdges
              ? monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
              : monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        }
      ]
    )
    this.decorationId = ids[0]
    this.addDisposer(() => model.deltaDecorations(ids, []))
    this.addDisposable(
      model.onDidChangeContent(() => {
        const tracked = model.getDecorationRange(ids[0])
        if (tracked != null) this.rangeRef.value = fromMonacoRange(tracked)
      })
    )
  }

  get target(): TextDocumentRange {
    return { textDocument: this.textDocument.id, range: this.range }
  }
}
