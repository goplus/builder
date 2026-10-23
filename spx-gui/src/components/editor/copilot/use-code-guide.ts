/**
 * @desc Shared logic for the copilot code-guide elements (code-change-hint / code-type-hint /
 * code-delete-hint / code-drag-hint), so they all behave consistently:
 * - re-show the guide as the streamed message settles (deduped by a signature),
 * - reopen it on demand (the returned `activate`, used as the chat link's click handler),
 * - only auto-drive the editor for a live suggestion (not restored history), and clean up on unmount;
 * - optionally open a real blank line to type a new statement into.
 *
 * Note: "is the suggested edit already done?" is intentionally NOT decided here. The editor owns guide
 * completion (the controller's completion detection is baseline-relative, so showing a guide is harmless
 * even when similar code already exists). What this composable adds is the feature-level decision of
 * *when* to auto-drive the editor — only for the current, live round — so a restored chat doesn't re-pop
 * guides for edits the user already made.
 */

import { computed, onUnmounted, watch, type ComputedRef } from 'vue'
import { tabSize, insertSpaces } from '@/utils/xgo/highlighter'
import { useCopilotRound } from '@/components/copilot/context'
import type { CodeEditor, CodeGuide, TextDocument, TextDocumentIdentifier } from '@/components/editor/spx-code-editor'
import type { EditorCtx } from '@/components/editor/EditorContextProvider.vue'

export interface UseCodeGuideOptions {
  codeEditor: ComputedRef<CodeEditor | null>
  /** The guide to show, or null when not applicable. */
  guide: () => CodeGuide | null
  /** Signature of the guide; when it changes the guide is re-shown (keeps it correct as a message streams in). */
  signature: () => string
  /** Run right before showing the guide (e.g. open a blank line). Should be idempotent. */
  onBeforeShow?: () => void
  /** Run on cleanup (e.g. remove an opened blank line). */
  onCleanup?: () => void
}

export function useCodeGuide(options: UseCodeGuideOptions): { activate: () => void } {
  let currentId: string | null = null
  let shownKey = ''
  const round = useCopilotRound()

  function getUI() {
    return options.codeEditor.value?.getAttachedUI() ?? null
  }

  function activate() {
    const ui = getUI()
    const guide = options.guide()
    if (ui == null || guide == null) return
    const key = options.signature()
    if (key === shownKey && currentId != null) return
    shownKey = key
    options.onBeforeShow?.()
    currentId = ui.showGuide(guide)
  }

  // Auto-activation is gated to the current, live round so a restored/historical suggestion doesn't
  // re-pop its guide. Manual activation (the returned `activate`, used as the chat link's click handler)
  // stays ungated — clicking an old suggestion should still show it.
  function autoActivate() {
    if (round != null && !(round.round.isLive && round.isLastRound())) return
    activate()
  }

  function deactivate() {
    const ui = getUI()
    if (ui != null && currentId != null) ui.clearGuide(currentId)
    currentId = null
    shownKey = ''
    options.onCleanup?.()
  }

  // When the controller clears OUR guide (e.g. another guide in the same reply displaced it, or it
  // completed), run cleanup so a blank line opened for typing isn't orphaned, and reset so a click can
  // reopen it. (The controller allows only one active guide, so guides in one reply displace each other.)
  watch(
    getUI,
    (ui, _, onWatchCleanup) => {
      if (ui == null) return
      onWatchCleanup(
        ui.onGuideCleared((id) => {
          if (id !== currentId) return
          currentId = null
          shownKey = ''
          options.onCleanup?.()
        })
      )
    },
    { immediate: true }
  )

  // Re-activate as inputs settle (the message streams in), so the editor matches the final suggestion.
  watch(
    () => [options.guide(), getUI(), options.signature(), round?.round.isLive, round?.isLastRound()] as const,
    () => autoActivate(),
    { immediate: true }
  )
  onUnmounted(deactivate)

  return { activate }
}

export interface UseInsertionBlankLineOptions {
  codeEditor: ComputedRef<CodeEditor | null>
  editorCtx: { value: EditorCtx | null | undefined }
  textDocumentId: () => TextDocumentIdentifier
  /** 1-based line where the new statement should go. */
  line: () => number
}

/** One indent level, matching the editor's tab settings. */
function indentUnit(): string {
  return insertSpaces ? ' '.repeat(tabSize) : '\t'
}

/** Indentation for a new statement line inserted at `line`: match the previous line, one level deeper if it opens a block. */
function computeIndent(textDocument: TextDocument, line: number): string {
  const lineCount = textDocument.getValue().split(/\r?\n/).length
  const prevLine = Math.min(line - 1, lineCount) // clamp for append-past-end
  const prevContent = prevLine >= 1 ? textDocument.getLineContent(prevLine) : ''
  const prevIndent = prevContent.match(/^[\t ]*/)?.[0] ?? ''
  return /\{\s*$/.test(prevContent) ? prevIndent + indentUnit() : prevIndent
}

export interface InsertionBlankLine {
  open: () => void
  remove: () => void
  /** The indentation that the opened line will (or did) receive; empty when no blank line is opened. */
  indent: ComputedRef<string>
}

/**
 * Manage a blank line opened at `line`, so the user has a real, editable line to type a new statement
 * into (and the "Type the code here" chip can sit on it). The new line is pre-indented to match the
 * surrounding code, and removed again if left empty.
 */
export function useInsertionBlankLine(options: UseInsertionBlankLineOptions): InsertionBlankLine {
  let openedLine: number | null = null

  // True when a new line should be opened: appending past the end, or the target line already holds content.
  // (When the target line is an existing empty line, the user types into it directly.)
  const willOpen = computed(() => {
    const textDocument = options.codeEditor.value?.getTextDocument(options.textDocumentId())
    const line = options.line()
    if (textDocument == null || isNaN(line) || line < 1) return false
    const lineCount = textDocument.getValue().split(/\r?\n/).length
    if (line > lineCount) return true // append past the end
    return textDocument.getLineContent(line).trim() !== ''
  })

  const indent = computed(() => {
    if (!willOpen.value) return ''
    const textDocument = options.codeEditor.value?.getTextDocument(options.textDocumentId())
    if (textDocument == null) return ''
    return computeIndent(textDocument, options.line())
  })

  function open() {
    if (openedLine != null || !willOpen.value) return
    const codeEditor = options.codeEditor.value
    const editorCtx = options.editorCtx.value
    const line = options.line()
    if (codeEditor == null || editorCtx == null) return
    const textDocument = codeEditor.getTextDocument(options.textDocumentId())
    if (textDocument == null) return
    const lineCount = textDocument.getValue().split(/\r?\n/).length
    editorCtx.state.history.doAction({ name: { en: 'Open a line to type', zh: '插入空行以便输入' } }, () => {
      if (line > lineCount) {
        // Append a new indented line after the last line.
        const at = { line: lineCount, column: textDocument.getLineContent(lineCount).length + 1 }
        textDocument.pushEdits([{ range: { start: at, end: at }, newText: '\n' + indent.value }])
        openedLine = lineCount + 1
      } else {
        // Insert a new indented line above the (content-holding) target line.
        const at = { line, column: 1 }
        textDocument.pushEdits([{ range: { start: at, end: at }, newText: indent.value + '\n' }])
        openedLine = line
      }
    })
  }

  function remove() {
    if (openedLine == null) return
    const line = openedLine
    openedLine = null
    const codeEditor = options.codeEditor.value
    const editorCtx = options.editorCtx.value
    const textDocument = codeEditor?.getTextDocument(options.textDocumentId())
    if (textDocument == null || editorCtx == null) return
    if (textDocument.getLineContent(line).trim() !== '') return // user typed into it; keep it
    const lineCount = textDocument.getValue().split(/\r?\n/).length
    // For a trailing line, remove the preceding newline too; otherwise remove the line and its trailing newline.
    // When it's the only line there is no newline to remove — just clear its content (line numbers are
    // 1-based, so the `line - 1` branch would produce an invalid line 0).
    const range =
      lineCount <= 1
        ? { start: { line: 1, column: 1 }, end: { line: 1, column: textDocument.getLineContent(1).length + 1 } }
        : line >= lineCount
          ? {
              start: { line: line - 1, column: textDocument.getLineContent(line - 1).length + 1 },
              end: { line, column: textDocument.getLineContent(line).length + 1 }
            }
          : { start: { line, column: 1 }, end: { line: line + 1, column: 1 } }
    editorCtx.state.history.doAction({ name: { en: 'Remove the empty line', zh: '移除空行' } }, () =>
      textDocument.pushEdits([{ range, newText: '' }])
    )
  }

  return { open, remove, indent }
}
