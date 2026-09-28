/**
 * @file Code Guide Controller
 * @desc Manages copilot-driven, in-editor guidance: drag targets, type-along ghosts,
 * and deletion highlights. Unlike a code change, a guide never modifies the document;
 * it only renders hints and clears itself once the user has completed the suggested action.
 */

import { shallowRef } from 'vue'
import { uniqueId } from 'lodash'
import { diffChars } from 'diff'
import Emitter from '@/utils/emitter'
import { type Range, type TextDocumentIdentifier } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'

export type CodeGuide = { textDocument: TextDocumentIdentifier; range: Range } & (
  | {
      /** Guide the user to drag a block (e.g. an API reference item) into the editor. */
      kind: 'drag'
      /** Expected code, used to also highlight the matching item in the API reference panel. */
      code?: string
    }
  | {
      /** Guide the user to manually type the given code at the target location. */
      kind: 'type'
      code: string
    }
  | {
      /** Guide the user to delete the highlighted range. */
      kind: 'delete'
    }
  | {
      /**
       * Guide the user to replace `range` with `code`, showing the deletion (red) and the
       * addition (green) at the same time. `range` may be a sub-line range (inline change) or
       * span whole lines. `code` may be empty (then it behaves like a deletion).
       */
      kind: 'change'
      code: string
    }
)

export type ActiveCodeGuide = {
  id: string
  guide: CodeGuide
}

/** Normalize code for whitespace-insensitive comparison. */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '')
}

/** Leading identifier (function name) of a snippet or code line, e.g. `turn ${1}` / `turn Left` → `turn`. */
export function leadingIdentifier(code: string): string {
  return code.trimStart().match(/^[A-Za-z_$][\w$]*/)?.[0] ?? ''
}

/**
 * Length of the common prefix and (non-overlapping) common suffix between two strings.
 * Used to narrow a replacement down to the part that actually differs, so a change like
 * `step 160` → `step 200` highlights only `160` → `200`.
 */
export function diffEdges(oldText: string, newText: string): { prefix: number; suffix: number } {
  const maxPrefix = Math.min(oldText.length, newText.length)
  let prefix = 0
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++
  let suffix = 0
  while (
    suffix < oldText.length - prefix &&
    suffix < newText.length - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++
  }
  return { prefix, suffix }
}

/**
 * Number of identical leading and (non-overlapping) trailing lines shared by `oldText` and `newText`.
 * Lets a multi-line change drop unchanged lines (including shared indentation lines) and narrow to the
 * lines that actually differ.
 */
export function trimCommonLines(oldText: string, newText: string): { prefixLines: number; suffixLines: number } {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  let prefixLines = 0
  while (
    prefixLines < oldLines.length &&
    prefixLines < newLines.length &&
    oldLines[prefixLines] === newLines[prefixLines]
  ) {
    prefixLines++
  }
  let suffixLines = 0
  while (
    suffixLines < oldLines.length - prefixLines &&
    suffixLines < newLines.length - prefixLines &&
    oldLines[oldLines.length - 1 - suffixLines] === newLines[newLines.length - 1 - suffixLines]
  ) {
    suffixLines++
  }
  return { prefixLines, suffixLines }
}

/** Escape a string for literal use inside a `RegExp`. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Character-level diff of `current` against `target`: the spans of `current` that are NOT part of `target`
 * (old text still to be removed). Offsets are char indices into `current`. Recomputed on each edit, this
 * marks exactly the leftover-old characters — robust to any edit order, including inserting new code into
 * the middle of the old text, since every keystroke re-classifies old vs. new.
 */
export function diffRemovedSpans(current: string, target: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = []
  let offset = 0
  for (const part of diffChars(current, target)) {
    if (part.added) continue // present only in target → doesn't consume `current`
    if (part.removed) spans.push({ start: offset, end: offset + part.value.length })
    offset += part.value.length
  }
  return spans
}

/**
 * Whether changing `oldText` into `newText` is a single contiguous replacement — one changed region,
 * possibly with a shared prefix/suffix — rather than several scattered edits. Used to decide whether a
 * change is worth showing as a precise inline diff, or should be shown as a whole-line replacement (a
 * scattered char diff between unrelated snippets reads as noise, e.g. `setYpos y:0` → `stepTo Radish`).
 */
export function isContiguousDiff(oldText: string, newText: string): boolean {
  let changeGroups = 0
  let inChange = false
  for (const part of diffChars(oldText, newText)) {
    const changed = part.added === true || part.removed === true
    if (changed && !inChange) changeGroups++
    inChange = changed
  }
  return changeGroups <= 1
}

export class CodeGuideController extends Emitter<{ completed: { id: string }; cleared: { id: string } }> {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private activeRef = shallowRef<ActiveCodeGuide | null>(null)
  get active(): ActiveCodeGuide | null {
    return this.activeRef.value
  }

  private completionWatcher: (() => void) | null = null

  // Accessor for the active guide's live tracked region (delete/change/type), or null. Lets the renderer
  // read where the edit region currently is — e.g. to diff its content against the target for the red hint.
  private activeRegionRange: (() => Range | null) | null = null

  /** The active guide's tracked edit region in its current (post-edit) position, or null. */
  getActiveEditRange(): Range | null {
    return this.activeRegionRange?.() ?? null
  }

  /**
   * Show a guide. Only one guide can be active at a time; the previous one (if any)
   * is cleared first. Returns the new guide's ID.
   */
  setGuide(guide: CodeGuide): string {
    this.clearGuide()
    const id = uniqueId('code-guide-')
    this.activeRef.value = { id, guide }
    // Navigate to the target so the guide is visible & its document active.
    this.ui.open(guide.textDocument, guide.range.start)
    // For a drag guide, also highlight the matching item in the API reference panel.
    if (guide.kind === 'drag' && guide.code != null && guide.code !== '') {
      this.ui.apiReferenceController.highlightForCode(guide.code)
    }
    this.watchCompletion(id, guide)
    return id
  }

  /** Clear the active guide. When `id` is given, only clears if it matches the active guide. */
  clearGuide(id?: string): void {
    const active = this.activeRef.value
    if (active == null) return
    if (id != null && active.id !== id) return
    this.activeRef.value = null
    this.completionWatcher?.()
    this.completionWatcher = null
    this.ui.apiReferenceController.clearHighlight()
    // Notify the guide's owner (e.g. a chat element) so it can clean up its own side effects, such as a
    // blank line opened for typing — needed because one reply may have several guides that displace each other.
    this.emit('cleared', { id: active.id })
  }

  private watchCompletion(id: string, guide: CodeGuide) {
    const textDocument = this.ui.codeEditor.getTextDocument(guide.textDocument)
    if (textDocument == null) return
    const model = textDocument.monacoTextModel

    // Drag: completion means a new statement of the expected kind appeared (e.g. a new `turn`), rather
    // than any content change — so editing elsewhere doesn't dismiss the hint. Compile the word matcher
    // once: it is evaluated on every content change while the guide is active.
    const dragName = guide.kind === 'drag' && guide.code != null ? leadingIdentifier(guide.code) : ''
    const dragMatcher = dragName !== '' ? new RegExp(`(^|[^\\w$])${escapeRegExp(dragName)}(?![\\w$])`, 'g') : null
    const dragBaseline = guide.kind === 'drag' ? textDocument.getValue() : ''
    const dragBaselineCount = dragMatcher != null ? (textDocument.getValue().match(dragMatcher) ?? []).length : 0

    // Delete / change / type: track the target region with an (invisible) Monaco decoration. Monaco keeps
    // the decoration's range in sync as the document is edited, so completion looks only at the region's own
    // current content. This makes it robust to edits elsewhere (line shifts), duplicate snippets, and the
    // delete-then-retype case. Completion is when the region reaches its target text: empty for a deletion,
    // the new code for a change, the typed code for a type hint.
    const trackedTarget = guide.kind === 'change' || guide.kind === 'type' ? normalizeCode(guide.code) : ''
    let trackId: string | null = null
    if (guide.kind === 'delete' || guide.kind === 'change' || guide.kind === 'type') {
      const stickiness =
        guide.kind === 'delete'
          ? // Don't grow at edges: an insert right before the highlighted lines should push them down,
            // not be swallowed into the region we're checking for emptiness.
            this.ui.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          : // Grow at both edges so the region keeps covering the code the user types / the replacement.
            this.ui.monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
      trackId =
        model.deltaDecorations(
          [],
          [
            {
              range: {
                startLineNumber: guide.range.start.line,
                startColumn: guide.range.start.column,
                endLineNumber: guide.range.end.line,
                endColumn: guide.range.end.column
              },
              options: { stickiness }
            }
          ]
        )[0] ?? null
    }
    const trackedRegion = (): string => {
      if (trackId == null) return ''
      const range = model.getDecorationRange(trackId)
      return range == null ? '' : model.getValueInRange(range)
    }
    // Expose the live region so the renderer can diff its content against the target for the red hint.
    this.activeRegionRange =
      trackId == null
        ? null
        : () => {
            const r = model.getDecorationRange(trackId)
            return r == null
              ? null
              : {
                  start: { line: r.startLineNumber, column: r.startColumn },
                  end: { line: r.endLineNumber, column: r.endColumn }
                }
          }

    const isCompleted = (): boolean => {
      switch (guide.kind) {
        case 'delete':
        case 'change':
        case 'type':
          // The tracked region reached its target: empty for a deletion, the new/typed code otherwise.
          return normalizeCode(trackedRegion()) === trackedTarget
        case 'drag':
          // A new statement of the expected kind appeared (the block was dropped / typed).
          if (dragMatcher != null) return (textDocument.getValue().match(dragMatcher) ?? []).length > dragBaselineCount
          // No expected code to match against: fall back to "any content change".
          return textDocument.getValue() !== dragBaseline
      }
    }

    const off = textDocument.on('didChangeContent', () => {
      if (this.activeRef.value?.id !== id) return
      if (!isCompleted()) return
      this.emit('completed', { id })
      this.clearGuide(id)
    })
    this.completionWatcher = () => {
      off()
      if (trackId != null) model.deltaDecorations([trackId], [])
      this.activeRegionRange = null
    }
  }

  dispose() {
    this.clearGuide()
    super.dispose()
  }
}
