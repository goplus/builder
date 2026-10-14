<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type * as monaco from 'monaco-editor'
import { tabSize } from '@/utils/xgo/highlighter'
import { textDocumentIdEq, type Range } from '../../common'
import { useDecorations, useViewZone, toMonacoRange, type ViewZoneSpec } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { diffRemovedSpans, type CodeGuide, type CodeGuideController } from '.'

const props = defineProps<{
  controller: CodeGuideController
}>()

const { ui } = useCodeEditorUICtx()

// Bumped whenever the active document content changes, so type-ghost rendering re-runs as the user types.
const docVersion = ref(0)
watch(
  () => ui.activeTextDocument,
  (doc, _, onCleanup) => {
    if (doc == null) return
    onCleanup(doc.on('didChangeContent', () => docVersion.value++))
  },
  { immediate: true }
)

// Line count of the active document, recomputed once per content change (shared by the rendering helpers
// below so each keystroke doesn't re-split the whole document several times).
const lineCount = computed(() => {
  void docVersion.value
  return ui.activeTextDocument?.getValue().split(/\r?\n/).length ?? 0
})

// Only render the guide when its target document is the one currently shown in the editor.
const activeGuide = computed(() => {
  const active = props.controller.active
  if (active == null) return null
  if (!textDocumentIdEq(ui.activeTextDocument?.id ?? null, active.guide.textDocument)) return null
  return active.guide
})

useDecorations(() => {
  const guide = activeGuide.value
  if (guide == null) return []
  switch (guide.kind) {
    case 'delete':
      return deleteDecorations(guide.range)
    case 'change':
      return changeDecorations(guide)
    case 'type':
      return typeChipDecorations(guide)
    case 'drag':
      return dragInlineDecorations(guide)
  }
})

useViewZone(() => {
  const guide = activeGuide.value
  if (guide == null) return null
  if (guide.kind === 'type' || guide.kind === 'change') return additionZone(guide)
  if (guide.kind === 'drag') return dragNewLineZone(guide)
  return null
})

/** A range that stays within a single line is rendered inline; otherwise it spans whole lines. */
function isInlineRange(range: Range): boolean {
  return range.start.line === range.end.line
}

/** Red highlight for the text to delete: inline for a sub-line range, whole-line otherwise. */
function deleteDecorations(range: Range): monaco.editor.IModelDeltaDecoration[] {
  if (isInlineRange(range)) {
    if (range.start.column === range.end.column) return [] // nothing to delete (pure insertion)
    // `inlineClassName` styles the actual characters, so the strike-through renders reliably.
    return [{ range: toMonacoRange(range), options: { inlineClassName: 'code-editor-guide-delete-inline' } }]
  }
  // The range ends at column 1 of the line *after* the last removed line, so exclude that trailing line.
  const endLine = range.end.column === 1 && range.end.line > range.start.line ? range.end.line - 1 : range.end.line
  return [
    {
      range: { startLineNumber: range.start.line, startColumn: 1, endLineNumber: endLine, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'code-editor-guide-delete-line',
        inlineClassName: 'code-editor-guide-delete-line-text',
        linesDecorationsClassName: 'code-editor-guide-delete-line-header'
      }
    }
  ]
}

/**
 * Red strike-through for a single-line change, computed by diffing the live edit region against the target
 * code so it marks only the characters that are still old (to remove). Recomputed on every edit, it stays
 * correct regardless of edit order — typing new code next to or inside the old text is classified as "new"
 * (not struck), and only the leftover old characters are red.
 */
function inlineChangeRedDecorations(guide: CodeGuide & { kind: 'change' }): monaco.editor.IModelDeltaDecoration[] {
  void docVersion.value
  const doc = ui.activeTextDocument
  if (doc == null) return []
  const region = props.controller.getActiveEditRange()
  if (region == null) return deleteDecorations(guide.range) // no live region yet → static strike-through
  const current = doc.getValueInRange(region)
  const startOffset = doc.getOffsetAt(region.start)
  return diffRemovedSpans(current, guide.code).map((span) => ({
    range: toMonacoRange({
      start: doc.getPositionAt(startOffset + span.start),
      end: doc.getPositionAt(startOffset + span.end)
    }),
    options: { inlineClassName: 'code-editor-guide-delete-inline' }
  }))
}

/**
 * Red for a whole-line replacement (a wholesale change of unrelated code): strike through the old line
 * content once, with NeverGrows stickiness so text the user types at either edge is NOT swallowed into the
 * red — their input is assumed to be the new code. Monaco tracks the decoration, shrinking it as the old
 * content is deleted. (Text inserted in the middle of the old content is still covered — an accepted edge.)
 */
function wholeLineChangeRedDecorations(guide: CodeGuide & { kind: 'change' }): monaco.editor.IModelDeltaDecoration[] {
  const doc = ui.activeTextDocument
  if (doc == null) return []
  const line = guide.range.start.line
  const contentLength = doc.getLineContent(line).length
  if (contentLength === 0) return []
  return [
    {
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: contentLength + 1 },
      options: {
        inlineClassName: 'code-editor-guide-delete-inline',
        stickiness: ui.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ]
}

/**
 * Decorations for a change: red strike-through for the removed text, plus — for a pure inline insertion
 * (empty range) — a "Type the code here" chip at the insertion point that marks where the new code goes.
 * The green code itself is shown below (additionZone), with an arrow pointing back at the chip. Single-line
 * (inline) changes use a per-keystroke char diff; whole-line replacements strike the old content once and
 * let the user's typed input stay un-red (see `wholeLineChangeRedDecorations`).
 */
function changeDecorations(guide: CodeGuide & { kind: 'change' }): monaco.editor.IModelDeltaDecoration[] {
  const { start, end } = guide.range
  const decorations = isInlineRange(guide.range)
    ? inlineChangeRedDecorations(guide)
    : wholeLineChangeRedDecorations(guide)
  const isPureInlineInsertion = start.line === end.line && start.column === end.column
  if (isPureInlineInsertion && guide.code !== '') {
    decorations.push({
      range: {
        startLineNumber: start.line,
        startColumn: start.column,
        endLineNumber: start.line,
        endColumn: start.column
      },
      options: {
        showIfCollapsed: true,
        after: {
          content: ui.i18n.t({ en: 'Type the code here', zh: '在这里输入代码' }),
          inlineClassName: 'code-editor-guide-chip',
          cursorStops: ui.monaco.editor.InjectedTextCursorStops.Left
        }
      }
    })
  }
  return decorations
}

/**
 * Where the green addition aligns to (priority): the insertion chip, else the inline red, else the
 * whole-line red. `afterLineNumber` is the line the green sits below. When the anchor is not found at
 * render time (e.g. the chip is hidden after the user starts typing), the green falls back to no
 * indentation (see `alignAdditionNode`).
 */
function resolveAdditionAnchor(guide: CodeGuide & { kind: 'type' | 'change' }): {
  anchorSelector: string
  afterLineNumber: number
} {
  const { start, end } = guide.range
  if (guide.kind === 'type') {
    return { anchorSelector: '.code-editor-guide-chip', afterLineNumber: start.line }
  }
  if (isInlineRange(guide.range)) {
    const isPureInsertion = start.column === end.column
    return {
      anchorSelector: isPureInsertion ? '.code-editor-guide-chip' : '.code-editor-guide-delete-inline',
      afterLineNumber: start.line
    }
  }
  const endLine = end.column === 1 && end.line > start.line ? end.line - 1 : end.line
  return { anchorSelector: '.code-editor-guide-delete-line-text', afterLineNumber: endLine }
}

/**
 * The unified green addition (type & change, single/inline/multi-line): the code shown as a view zone
 * below, aligned to its anchor with a `↳` connector. Only the anchor & line differ per case.
 */
function additionZone(guide: CodeGuide & { kind: 'type' | 'change' }): ViewZoneSpec | null {
  const codeLines = guide.code.replace(/\n+$/, '').split('\n')
  if (codeLines.length === 1 && codeLines[0] === '') return null // pure deletion → no green
  const { anchorSelector, afterLineNumber } = resolveAdditionAnchor(guide)
  const { node, dispose } = createAdditionNode(codeLines.join('\n'), '↳', anchorSelector)
  return { afterLineNumber, heightInLines: codeLines.length, domNode: node, onRemove: dispose }
}

/** Inline drop-target hint: an orange chip rendered after the line content (for typing into an empty line). */
function dragInlineDecorations(guide: CodeGuide & { kind: 'drag' }): monaco.editor.IModelDeltaDecoration[] {
  void docVersion.value
  const line = guide.range.start.line
  // New-line insertion: the chip is shown as a block above the line instead of appended inline.
  if (isNewLineInsertion(line)) return []
  const doc = ui.activeTextDocument
  let column = 1
  if (doc != null && line <= lineCount.value) column = doc.getLineContent(line).length + 1
  return [
    {
      range: { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column },
      options: {
        showIfCollapsed: true,
        after: {
          content: ui.i18n.t({ en: 'Drag the block here', zh: '把积木拖到这里' }),
          inlineClassName: 'code-editor-guide-chip'
        }
      }
    }
  ]
}

/** When dragging inserts a new line (target line has content), show the drop indicator as a block above it. */
function dragNewLineZone(guide: CodeGuide & { kind: 'drag' }): ViewZoneSpec | null {
  void docVersion.value
  if (!isNewLineInsertion(guide.range.start.line)) return null
  return { afterLineNumber: Math.max(guide.range.start.line - 1, 0), heightInLines: 1, domNode: createDragNode() }
}

/**
 * Whether the insertion creates a brand-new line, as opposed to typing into an already-empty line.
 * True when appending past the end of the document, or when the target line already holds content.
 */
function isNewLineInsertion(startLine: number): boolean {
  const doc = ui.activeTextDocument
  if (doc == null) return false
  if (startLine > lineCount.value) return true // appending past the end → a new line
  return doc.getLineContent(startLine).trim() !== ''
}

/** "Type the code here" chip rendered inline on the (blank) target line — where the user will actually type. */
function typeChipDecorations(guide: CodeGuide & { kind: 'type' }): monaco.editor.IModelDeltaDecoration[] {
  void docVersion.value
  const doc = ui.activeTextDocument
  if (doc == null) return []
  const line = guide.range.start.line
  if (line > lineCount.value) return []
  if (doc.getLineContent(line).trim() !== '') return [] // user started typing → hide the chip
  // Anchor the chip after the line content (i.e. after any indentation) and keep the caret on its left,
  // so typing pushes characters in before the chip instead of making the caret jump past it.
  const column = doc.getLineContent(line).length + 1
  return [
    {
      range: { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column },
      options: {
        showIfCollapsed: true,
        after: {
          content: ui.i18n.t({ en: 'Type the code here', zh: '在这里输入代码' }),
          inlineClassName: 'code-editor-guide-chip',
          cursorStops: ui.monaco.editor.InjectedTextCursorStops.Left
        }
      }
    }
  ]
}

/** Match a green-ghost code element to the editor's own font and tab width, so it reads like real code. */
function applyEditorCodeFont(el: HTMLElement) {
  const fontInfo = ui.editor.getOption(ui.monaco.editor.EditorOption.fontInfo)
  el.style.fontFamily = fontInfo.fontFamily
  el.style.fontSize = `${fontInfo.fontSize}px`
  el.style.lineHeight = `${fontInfo.lineHeight}px`
  el.style.tabSize = `${tabSize}`
}

function createDragNode(): HTMLElement {
  const node = document.createElement('div')
  node.className = 'code-editor-guide-drag-block'
  const chip = document.createElement('span')
  chip.className = 'code-editor-guide-chip'
  chip.textContent = ui.i18n.t({ en: 'Drag the block here', zh: '把积木拖到这里' })
  node.appendChild(chip)
  return node
}

/** Green addition (one or more lines) aligned under its anchor element with a connector. */
function createAdditionNode(
  code: string,
  connector: string,
  anchorSelector: string
): { node: HTMLElement; dispose: () => void } {
  const node = document.createElement('div')
  node.className = 'code-editor-guide-addition'
  const connectorEl = document.createElement('span')
  connectorEl.className = 'code-editor-guide-addition-connector'
  connectorEl.textContent = connector
  const text = document.createElement('span')
  text.className = 'code-editor-guide-addition-text'
  text.textContent = code.replace(/\n+$/, '')
  applyEditorCodeFont(text)
  node.appendChild(connectorEl)
  node.appendChild(text)
  const dispose = alignAdditionNode(node, anchorSelector)
  return { node, dispose }
}

/**
 * Align the addition under its anchor (the red strike-through for a replacement, or the insertion chip)
 * by measuring the actual rendered element. Robust against inlay hints (injected `before` text), which
 * column→pixel APIs misreport. Returns a disposer that cancels any pending frame (called when the view
 * zone is removed, so alignment doesn't keep running against a stale/disposed editor).
 */
function alignAdditionNode(node: HTMLElement, anchorSelector: string): () => void {
  let attempts = 0
  let rafId: number | null = null
  const tryAlign = () => {
    rafId = null
    if (!node.isConnected) {
      // Not inserted into the DOM yet — wait a few frames; give up if it never connects (zone removed).
      if (attempts++ < 10) rafId = requestAnimationFrame(tryAlign)
      return
    }
    const anchorEl = ui.editor.getDomNode()?.querySelector(anchorSelector)
    if (anchorEl != null) {
      // Shift via margin (not padding): the node's padding-left is the connector gutter, and we want
      // the connector — at the node's left edge — to line up with the anchor.
      const delta = anchorEl.getBoundingClientRect().left - node.getBoundingClientRect().left
      if (delta > 0) node.style.marginLeft = `${delta}px`
      return
    }
    if (attempts++ < 10) rafId = requestAnimationFrame(tryAlign)
  }
  rafId = requestAnimationFrame(tryAlign)
  return () => {
    if (rafId != null) cancelAnimationFrame(rafId)
    rafId = null
  }
}
</script>

<template>
  <div></div>
</template>

<style>
.code-editor-guide-delete-line,
.code-editor-guide-delete-line-header {
  background-color: rgba(244, 63, 94, 0.18);
}

.code-editor-guide-delete-line-header {
  width: 100% !important;
  left: 0 !important;
}

/* Inline red highlight for a sub-line deletion/replacement. */
.code-editor-guide-delete-inline {
  background-color: rgba(244, 63, 94, 0.22);
  text-decoration: line-through;
  text-decoration-color: rgba(244, 63, 94, 0.9);
}

/* Strike-through for the text of whole-line deletions. */
.code-editor-guide-delete-line-text {
  text-decoration: line-through;
  text-decoration-color: rgba(244, 63, 94, 0.9);
}

/* Green addition shown below the removed text / insertion chip. The connector sits in a left gutter
   (absolutely positioned), so every code line — including line 2+ — aligns to the same left edge.
   The code's font, size and tab width are set in JS to exactly match the editor (see applyEditorCodeFont). */
.code-editor-guide-addition {
  box-sizing: border-box;
  position: relative;
  height: 100%;
  padding-left: 1.3em;
  white-space: pre;
}

.code-editor-guide-addition-connector {
  position: absolute;
  left: 0;
  top: 0;
  color: var(--ui-color-hint-2, #999);
  opacity: 0.7;
}

.code-editor-guide-addition-text {
  padding: 0 2px;
  border-radius: 2px;
  color: rgb(22, 163, 74);
  background-color: rgba(34, 197, 94, 0.2);
}

/* Shared amber signpost chip for guide hints — reused by the type & drag hints, and available to other hints. */
.code-editor-guide-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  padding: 1px 8px;
  border: 1px dashed rgba(249, 115, 22, 0.7);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  /* When rendered as Monaco injected text the span also gets a token color class (`mtk1`, near-black);
     `!important` keeps the chip amber regardless of cascade order. */
  color: rgb(234, 88, 12) !important;
  background-color: rgba(249, 115, 22, 0.16);
}

/* View-zone container that vertically centers the drag chip when dragging inserts a new line. */
.code-editor-guide-drag-block {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
}
</style>
