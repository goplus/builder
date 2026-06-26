import { describe, it, expect, vi } from 'vitest'
import Emitter from '@/utils/emitter'
import type { Range, TextDocumentIdentifier } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'
import { CodeGuideController, diffEdges, diffRemovedSpans, isContiguousDiff, trimCommonLines } from '.'

const textDocumentId: TextDocumentIdentifier = { uri: 'file:///Test.spx' }

type MonacoRange = { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }

/** Subset of Monaco's TrackedRangeStickiness used by the controller. */
const TrackedRangeStickiness = { AlwaysGrowsWhenTypingAtEdges: 0, NeverGrowsWhenTypingAtEdges: 1 }

/**
 * Minimal TextDocument stub: an emitter with mutable content plus a Monaco-like text model that supports
 * decoration tracking. Each `setContent` is treated as a single contiguous edit (derived via `diffEdges`)
 * and tracked decoration ranges are adjusted accordingly — mirroring how Monaco keeps a decoration in sync
 * with edits, so completion detection can be exercised end-to-end (including edits made elsewhere).
 */
class FakeTextDocument extends Emitter<{ didChangeContent: string }> {
  id = textDocumentId
  constructor(private content: string) {
    super()
  }
  getValue() {
    return this.content
  }

  // --- offset <-> position helpers (offsets count '\n' as one char) ---
  private offsetAt(line: number, column: number) {
    const lines = this.content.split('\n')
    let offset = 0
    for (let i = 0; i < line - 1; i++) offset += (lines[i] ?? '').length + 1
    return offset + (column - 1)
  }
  private positionAt(offset: number) {
    const before = this.content.slice(0, offset).split('\n')
    return { line: before.length, column: before[before.length - 1].length + 1 }
  }

  // --- mock decoration store (ranges kept as char offsets) ---
  private decorations = new Map<string, { start: number; end: number; grows: boolean }>()
  private decorationSeq = 0
  monacoTextModel = {
    deltaDecorations: (
      oldIds: string[],
      newDecs: { range: MonacoRange; options?: { stickiness?: number } }[]
    ): string[] => {
      for (const id of oldIds) this.decorations.delete(id)
      return newDecs.map((d) => {
        const id = `dec-${this.decorationSeq++}`
        this.decorations.set(id, {
          start: this.offsetAt(d.range.startLineNumber, d.range.startColumn),
          end: this.offsetAt(d.range.endLineNumber, d.range.endColumn),
          grows: d.options?.stickiness === TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
        })
        return id
      })
    },
    getDecorationRange: (id: string): MonacoRange | null => {
      const d = this.decorations.get(id)
      if (d == null) return null
      const start = this.positionAt(d.start)
      const end = this.positionAt(d.end)
      return { startLineNumber: start.line, startColumn: start.column, endLineNumber: end.line, endColumn: end.column }
    },
    getValueInRange: (range: MonacoRange): string =>
      this.content.slice(
        this.offsetAt(range.startLineNumber, range.startColumn),
        this.offsetAt(range.endLineNumber, range.endColumn)
      )
  }

  setContent(content: string) {
    // Derive the single contiguous edit that turns the old content into the new one (delete [es, ee),
    // then insert `insertLen` chars at es), then adjust each tracked decoration the way Monaco would.
    const old = this.content
    const { prefix, suffix } = diffEdges(old, content)
    const es = prefix
    const ee = old.length - suffix
    const dl = ee - es
    const insertLen = content.length - prefix - suffix
    for (const d of this.decorations.values()) {
      // Deletion of [es, ee): clamp endpoints inside the deleted span, shift those after it left.
      const adjustForDeletion = (p: number) => (p <= es ? p : p >= ee ? p - dl : es)
      let start = adjustForDeletion(d.start)
      let end = adjustForDeletion(d.end)
      // Insertion of `insertLen` at es.
      if (es < start) {
        start += insertLen
        end += insertLen // strictly before the region: shift it
      } else if (es > end) {
        // strictly after the region: unchanged
      } else if (es > start && es < end) {
        end += insertLen // strictly inside: always grow
      } else if (d.grows) {
        end += insertLen // at an edge, AlwaysGrows: include the inserted text
      } else if (es === start) {
        start += insertLen
        end += insertLen // at the start edge, NeverGrows: push the region after the insertion
      } // at the end edge, NeverGrows: unchanged
      d.start = start
      d.end = end
    }
    this.content = content
    this.emit('didChangeContent', content)
  }
}

function createController(initialContent: string) {
  const doc = new FakeTextDocument(initialContent)
  const open = vi.fn()
  const apiReferenceController = { highlightForCode: vi.fn(), clearHighlight: vi.fn() }
  const ui = {
    open,
    monaco: { editor: { TrackedRangeStickiness } },
    codeEditor: {
      getTextDocument: () => doc
    },
    apiReferenceController
  } as unknown as CodeEditorUIController
  return { controller: new CodeGuideController(ui), doc, open, apiReferenceController }
}

function lineRange(line: number, count = 0): Range {
  return { start: { line, column: 1 }, end: { line: line + count, column: 1 } }
}

describe('CodeGuideController', () => {
  it('sets an active guide and navigates to it', () => {
    const { controller, open } = createController('')
    const id = controller.setGuide({
      kind: 'type',
      textDocument: textDocumentId,
      range: lineRange(1),
      code: 'say "hi"'
    })
    expect(controller.active?.id).toBe(id)
    expect(controller.active?.guide.kind).toBe('type')
    expect(open).toHaveBeenCalledWith(textDocumentId, { line: 1, column: 1 })
  })

  it('keeps only one active guide at a time', () => {
    const { controller } = createController('')
    controller.setGuide({ kind: 'type', textDocument: textDocumentId, range: lineRange(1), code: 'a' })
    const second = controller.setGuide({ kind: 'delete', textDocument: textDocumentId, range: lineRange(1, 1) })
    expect(controller.active?.id).toBe(second)
    expect(controller.active?.guide.kind).toBe('delete')
  })

  it('clearGuide only clears the matching guide when an id is given', () => {
    const { controller } = createController('')
    const id = controller.setGuide({ kind: 'drag', textDocument: textDocumentId, range: lineRange(1) })
    controller.clearGuide('other-id')
    expect(controller.active?.id).toBe(id)
    controller.clearGuide(id)
    expect(controller.active).toBeNull()
  })

  it('completes a type guide when the code is typed (ignoring whitespace)', () => {
    const { controller, doc } = createController('')
    const completed = vi.fn()
    controller.on('completed', completed)
    const id = controller.setGuide({
      kind: 'type',
      textDocument: textDocumentId,
      range: lineRange(1),
      code: 'say "hi"'
    })

    doc.setContent('say ') // partial, should not complete
    expect(controller.active?.id).toBe(id)

    doc.setContent('say   "hi"') // extra whitespace, still matches
    expect(completed).toHaveBeenCalledWith({ id })
    expect(controller.active).toBeNull()
  })

  it('completes a type guide only when the code is typed at the target line, not on edits elsewhere', () => {
    const { controller, doc } = createController('move 10\n') // type target is the empty line 2
    const completed = vi.fn()
    controller.on('completed', completed)
    controller.setGuide({ kind: 'type', textDocument: textDocumentId, range: lineRange(2), code: 'say "hi"' })

    doc.setContent('move 10 fast\n') // edit line 1 (elsewhere) → target region untouched
    expect(completed).not.toHaveBeenCalled()
    expect(controller.active).not.toBeNull()

    doc.setContent('move 10 fast\nsay "hi"') // typed at the target line
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes a type guide after the user removes an earlier identical line, then types at the target', () => {
    const { controller, doc } = createController('say "hi"\n') // an identical statement already exists on line 1
    const completed = vi.fn()
    controller.on('completed', completed)
    // Target is the empty line 2. Region tracking follows the location, so the pre-existing copy and the
    // delete-then-retype sequence (which a count-based check would miss) both work.
    controller.setGuide({ kind: 'type', textDocument: textDocumentId, range: lineRange(2), code: 'say "hi"' })

    doc.setContent('\n') // user deletes the earlier copy first
    expect(completed).not.toHaveBeenCalled()

    doc.setContent('\nsay "hi"') // then types the code at the target
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes a delete guide once the highlighted lines are removed, even after editing elsewhere', () => {
    const { controller, doc } = createController('a\nb\nc\nd')
    const completed = vi.fn()
    controller.on('completed', completed)
    // delete lines 2 & 3 ("b" and "c")
    controller.setGuide({ kind: 'delete', textDocument: textDocumentId, range: lineRange(2, 2) })

    doc.setContent('x\na\nb\nc\nd') // inserted a line above: the tracked lines shift down but remain
    expect(completed).not.toHaveBeenCalled()

    doc.setContent('x\na\nd') // the (shifted) highlighted lines removed
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('does not complete a delete guide until the lines are fully removed', () => {
    const { controller, doc } = createController('a\nbb\nc\nd')
    const completed = vi.fn()
    controller.on('completed', completed)
    // delete lines 2 & 3 ("bb" and "c")
    controller.setGuide({ kind: 'delete', textDocument: textDocumentId, range: lineRange(2, 2) })

    doc.setContent('a\nb\nc\nd') // only one character removed, not fully deleted
    expect(completed).not.toHaveBeenCalled()
    expect(controller.active).not.toBeNull()

    doc.setContent('a\nd') // fully removed → reaches the post-deletion state
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes a whole-line change when the lines reach the replaced state', () => {
    const { controller, doc } = createController('turnTo Radish\nstep 5')
    const completed = vi.fn()
    controller.on('completed', completed)
    // replace line 1 with "turnTo Stone3"
    controller.setGuide({
      kind: 'change',
      textDocument: textDocumentId,
      range: lineRange(1, 1),
      code: 'turnTo Stone3\n'
    })

    doc.setContent('turnTo Stone33\nstep 5') // close but not exact
    expect(completed).not.toHaveBeenCalled()

    doc.setContent('turnTo Stone3\nstep 5')
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes an inline (partial-line) change', () => {
    const { controller, doc } = createController('step step:90')
    const completed = vi.fn()
    controller.on('completed', completed)
    // replace "90" (columns 11-13) with "180"
    const range = { start: { line: 1, column: 11 }, end: { line: 1, column: 13 } }
    controller.setGuide({ kind: 'change', textDocument: textDocumentId, range, code: '180' })

    doc.setContent('step step:9') // partially edited
    expect(completed).not.toHaveBeenCalled()

    doc.setContent('step step:180')
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes a change guide after the user has edited elsewhere first', () => {
    const { controller, doc } = createController('turnTo Radish\nstep 5')
    const completed = vi.fn()
    controller.on('completed', completed)
    // replace line 1 with "turnTo Stone3"
    controller.setGuide({
      kind: 'change',
      textDocument: textDocumentId,
      range: lineRange(1, 1),
      code: 'turnTo Stone3\n'
    })

    doc.setContent('turnTo Radish\nstep 5\nsay "hi"') // appended a line below the target
    expect(completed).not.toHaveBeenCalled()

    doc.setContent('turnTo Stone3\nstep 5\nsay "hi"') // now apply the suggested change
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('highlights the matching API reference item for a drag guide and clears it afterwards', () => {
    const { controller, doc, apiReferenceController } = createController('')
    const id = controller.setGuide({
      kind: 'drag',
      textDocument: textDocumentId,
      range: lineRange(1),
      code: 'turn Left'
    })
    expect(apiReferenceController.highlightForCode).toHaveBeenCalledWith('turn Left')

    doc.setContent('turn Left') // completing the drag clears the guide
    expect(apiReferenceController.clearHighlight).toHaveBeenCalled()
    expect(controller.active).toBeNull()
    void id
  })

  it('completes a drag guide on any content change when it has no expected code', () => {
    const { controller, doc } = createController('')
    const completed = vi.fn()
    controller.on('completed', completed)
    controller.setGuide({ kind: 'drag', textDocument: textDocumentId, range: lineRange(1) })

    doc.setContent('move 10')
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('completes a drag guide only when a new statement of the expected kind appears', () => {
    const { controller, doc } = createController('turn Right') // already contains a `turn`
    const completed = vi.fn()
    controller.on('completed', completed)
    controller.setGuide({ kind: 'drag', textDocument: textDocumentId, range: lineRange(2), code: 'turn Left' })

    doc.setContent('turn Right\nsomething else') // edited elsewhere, no new `turn`
    expect(completed).not.toHaveBeenCalled()
    expect(controller.active).not.toBeNull()

    doc.setContent('turn Right\nturn Left') // a new `turn` statement appeared
    expect(completed).toHaveBeenCalledTimes(1)
    expect(controller.active).toBeNull()
  })

  it('emits "cleared" with the displaced guide id when another guide takes over', () => {
    const { controller } = createController('')
    const cleared = vi.fn()
    controller.on('cleared', cleared)
    const first = controller.setGuide({ kind: 'type', textDocument: textDocumentId, range: lineRange(1), code: 'a' })
    controller.setGuide({ kind: 'delete', textDocument: textDocumentId, range: lineRange(1, 1) })
    expect(cleared).toHaveBeenCalledWith({ id: first })
  })
})

describe('diffEdges', () => {
  it('finds the common prefix/suffix so only the real diff remains', () => {
    // shared prefix "step " and shared suffix "0" → only "16" vs "20" differ
    expect(diffEdges('step 160', 'step 200')).toEqual({ prefix: 5, suffix: 1 })
    // shared prefix "step:" and shared suffix "0" → only "9" vs "18" differ
    expect(diffEdges('step:90', 'step:180')).toEqual({ prefix: 5, suffix: 1 })
    expect(diffEdges('turnTo Radish', 'turnTo Stone3')).toEqual({ prefix: 7, suffix: 0 })
  })

  it('keeps a shared suffix out of the diff', () => {
    // "100px" -> "200px": only the leading digit differs
    expect(diffEdges('100px', '200px')).toEqual({ prefix: 0, suffix: 4 })
  })

  it('handles pure insertion and pure deletion', () => {
    expect(diffEdges('step', 'steps')).toEqual({ prefix: 4, suffix: 0 }) // insert "s" at end
    expect(diffEdges('steps', 'step')).toEqual({ prefix: 4, suffix: 0 }) // delete trailing "s"
    expect(diffEdges('abc', 'abc')).toEqual({ prefix: 3, suffix: 0 }) // identical
  })
})

describe('trimCommonLines', () => {
  it('drops identical leading and trailing lines', () => {
    // shared first line "\tturn -60"; only the second line differs
    expect(trimCommonLines('\tturn -60\n\tstep 50', '\tturn -60\n\tstep 100')).toEqual({
      prefixLines: 1,
      suffixLines: 0
    })
    // shared trailing line
    expect(trimCommonLines('\ta\n\tkeep', '\tb\n\tkeep')).toEqual({ prefixLines: 0, suffixLines: 1 })
  })

  it('does not over-trim when whole blocks differ', () => {
    expect(trimCommonLines('\tstepTo Radish\n\tsetXpos x:0', '\tturn -60\n\tstep 100')).toEqual({
      prefixLines: 0,
      suffixLines: 0
    })
  })

  it('counts prefix and suffix without overlap for identical blocks', () => {
    expect(trimCommonLines('a\nb', 'a\nb')).toEqual({ prefixLines: 2, suffixLines: 0 })
  })
})

describe('diffRemovedSpans', () => {
  it('marks the old text still present, regardless of where the new code was typed', () => {
    // new code typed to the right of the old → only the old "old" is removed
    expect(diffRemovedSpans('oldnew', 'new')).toEqual([{ start: 0, end: 3 }])
    // new code typed to the left of the old → only the trailing old is removed
    expect(diffRemovedSpans('newold', 'new')).toEqual([{ start: 3, end: 6 }])
  })

  it('handles old text on both sides of the new code (typed into the middle)', () => {
    // "x" + kept "new" + "y": both leftover chunks are removed, the new code in the middle is kept
    expect(diffRemovedSpans('xnewy', 'new')).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 5 }
    ])
  })

  it('returns no spans once the content matches the target, or for a pure insertion', () => {
    expect(diffRemovedSpans('new', 'new')).toEqual([])
    expect(diffRemovedSpans('', 'new')).toEqual([]) // nothing old to remove yet
  })
})

describe('isContiguousDiff', () => {
  it('is true for a single contiguous replacement (with shared prefix/suffix)', () => {
    expect(isContiguousDiff('AoldB', 'AnewB')).toBe(true)
    expect(isContiguousDiff('step 90', 'step 180')).toBe(true)
    expect(isContiguousDiff('', 'say "hi"')).toBe(true) // pure insertion
  })

  it('is false when the edits are scattered across unrelated text', () => {
    expect(isContiguousDiff('xAxBx', 'AB')).toBe(false) // "x" removed in three separate places
    expect(isContiguousDiff('setYpos y:0', 'stepTo Radish')).toBe(false)
  })
})
