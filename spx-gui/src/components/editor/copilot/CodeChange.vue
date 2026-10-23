<script lang="ts">
import { z } from 'zod'
import { codeFilePathSchema } from '@/components/copilot/common'

export const tagName = 'code-change-hint'

export const isRaw = true

export const description = 'Display a modification based on the existing code.'

export const detailedDescription = `Display a modification based on the existing code and guide the user to make it \
themselves in the editor (there is no "Apply" button). The removed text is highlighted in red and the new code is shown \
as a green addition at the same time, so the user can see exactly what to change. In the editor the highlight is \
automatically narrowed to the part that actually differs, so unchanged text around the edit is not marked. The guide \
disappears once the user has made the change.

To change something on a single line, use the \`old\` attribute with the exact existing text that contains the change:

<code-change-hint file="NiuXiaoQi.spx" line="10" old="step 5">step 10</code-change-hint>

(only \`5\` → \`10\` will be highlighted in the editor). To replace whole lines, use \`remove-line-count\`:

<code-change-hint file="NiuXiaoQi.spx" line="10" remove-line-count="2">
onClick => {
	say "Hello!"
}
</code-change-hint>

(replaces line 10 & 11 with the new code). Omit both \`old\` and \`remove-line-count\` for a pure insertion \
(only a green addition to type). Leave the content empty for a pure deletion (only a red highlight to remove).

IMPORTANT: when you want to MODIFY existing code (not add a brand-new line), you must express it as a change of the \
existing code — set \`old\` to the existing text (or \`remove-line-count\` to the lines) being modified, and put the new \
version in the content. Do NOT describe a modification by only supplying the new line as if inserting it; that would \
look like adding a duplicate line instead of changing the existing one. For example, to change \`step 150\` into \
\`step 180\`, write <code-change-hint file="..." line="3" old="step 150">step 180</code-change-hint>, not \
<code-change-hint file="..." line="3">step 180</code-change-hint>.`

export const attributes = z.object({
  file: codeFilePathSchema,
  line: z.string().describe('Line number of the change, 1-based'),
  old: z
    .string()
    .optional()
    .describe('Exact existing text on the line that contains the change (for a single-line edit)'),
  'remove-line-count': z.string().optional().describe('Number of whole lines to replace/remove, starting at line')
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useSlotText } from '@/utils/vnode'
import CodeView from '@/components/common/CodeView.vue'
import {
  CodeLink,
  diffEdges,
  getTextDocumentId,
  isContiguousDiff,
  leadingIdentifier,
  trimCommonLines,
  useCodeEditorRef,
  type CodeGuide,
  type Range
} from '@/components/editor/spx-code-editor'
import BlockWrapper from '@/components/copilot/markdown-elements/common/BlockWrapper.vue'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeGuide, useInsertionBlankLine } from './use-code-guide'

const props = defineProps<{
  /** Code file path, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Line number of the change */
  line: string
  /** Exact existing text on the line that contains the change (single-line edit) */
  old?: string
  /** Number of whole lines to replace/remove */
  removeLineCount?: string
}>()

const codeEditorRef = useCodeEditorRef()
const editorCtxRef = useEditorCtxRef()
const childrenText = useSlotText()

const textDocumentId = computed(() => getTextDocumentId(props.file))
const startLine = computed(() => parseInt(props.line, 10))
const removeLineCount = computed(() => (props.removeLineCount == null ? 0 : parseInt(props.removeLineCount, 10)))

// New code (replacement / insertion). Leading line break stripped to match the markdown code block.
const fullCode = computed(() => childrenText.value.replace(/^\n/, ''))
const hasAddition = computed(() => fullCode.value.trim() !== '')

const valid = computed(() => {
  const codeEditor = codeEditorRef.value
  if (codeEditor == null) return false
  if (codeEditor.getTextDocument(textDocumentId.value) == null) return false
  return !isNaN(startLine.value) && !isNaN(removeLineCount.value)
})

// The full range being replaced and its original text (used for the complete diff shown in chat).
// Returns null for a pure insertion (handled by the `type` guide).
const changeBase = computed<{ range: Range; oldText: string } | null>(() => {
  const codeEditor = codeEditorRef.value
  if (codeEditor == null || isNaN(startLine.value) || isNaN(removeLineCount.value)) return null
  const textDocument = codeEditor.getTextDocument(textDocumentId.value)
  if (textDocument == null) return null
  // Guard against an out-of-range target line, so `getLineContent` below never throws.
  const lineCount = textDocument.getValue().split(/\r?\n/).length
  if (startLine.value < 1 || startLine.value > lineCount) return null

  let range: Range | null = null
  if (props.old != null && props.old !== '') {
    const lineContent = textDocument.getLineContent(startLine.value)
    const index = lineContent.indexOf(props.old)
    if (index >= 0) {
      range = {
        start: { line: startLine.value, column: index + 1 },
        end: { line: startLine.value, column: index + 1 + props.old.length }
      }
    }
  }
  if (range == null && removeLineCount.value === 1) {
    const lineContent = textDocument.getLineContent(startLine.value)
    range = {
      start: { line: startLine.value, column: 1 },
      end: { line: startLine.value, column: lineContent.length + 1 }
    }
  }
  if (range == null && removeLineCount.value > 1) {
    range = {
      start: { line: startLine.value, column: 1 },
      end: { line: startLine.value + removeLineCount.value, column: 1 }
    }
  }
  // Heuristic: when neither `old` nor `remove-line-count` is given, but the target line already holds a
  // statement with the same function name as the new code (e.g. `step 150` → `step 180`), treat it as
  // replacing that line so it becomes a precise inline edit rather than inserting a whole new line.
  if (range == null && removeLineCount.value === 0) {
    const newText = fullCode.value.replace(/\n+$/, '')
    const lineContent = textDocument.getLineContent(startLine.value)
    const fnName = leadingIdentifier(newText)
    if (fnName !== '' && !newText.includes('\n') && leadingIdentifier(lineContent) === fnName) {
      range = {
        start: { line: startLine.value, column: 1 },
        end: { line: startLine.value, column: lineContent.length + 1 }
      }
    }
  }
  if (range == null) return null
  return { range, oldText: textDocument.getValueInRange(range) }
})

type ChangeTarget = { range: Range; code: string; lineInsertion: boolean }

/**
 * Narrow a single-line range by trimming the common prefix/suffix characters (incl. leading whitespace).
 * This is always an in-place edit (`lineInsertion: false`), even when it collapses to an empty range —
 * e.g. prepending text at the start of a line is an inline edit, NOT a new line.
 */
function charTrim(range: Range, oldText: string, newText: string): ChangeTarget {
  const { prefix, suffix } = diffEdges(oldText, newText)
  return {
    range: {
      start: { line: range.start.line, column: range.start.column + prefix },
      end: { line: range.end.line, column: range.end.column - suffix }
    },
    code: newText.slice(prefix, newText.length - suffix),
    lineInsertion: false
  }
}

/** A whole-line replacement: replace all of `line` with `code`, rendered as a whole-line (not inline) change. */
function wholeLineTarget(line: number, code: string): ChangeTarget {
  return { range: { start: { line, column: 1 }, end: { line: line + 1, column: 1 } }, code, lineInsertion: false }
}

/** Whether `range` spans a whole line's content (so it can be treated as a whole-line replacement). */
function isWholeLineRange(range: Range): boolean {
  const textDocument = codeEditorRef.value?.getTextDocument(textDocumentId.value)
  if (textDocument == null || range.start.line !== range.end.line) return false
  return range.start.column === 1 && range.end.column === textDocument.getLineContent(range.start.line).length + 1
}

// The narrowed range + code shown in the editor:
// - single-line: trim common prefix/suffix characters (incl. leading whitespace);
// - multi-line: drop identical leading/trailing lines (incl. shared indentation lines), then char-trim if a single line remains.
// `lineInsertion` marks the case where the change collapsed to inserting whole new line(s) (from line-level
// trimming), which is rendered as a new line — distinct from an inline edit that merely has an empty range.
const changeTarget = computed<ChangeTarget | null>(() => {
  const base = changeBase.value
  if (base == null) return null
  const newText = fullCode.value.replace(/\n+$/, '')
  const oldText = base.oldText.replace(/\n+$/, '')

  if (base.range.start.line === base.range.end.line && !oldText.includes('\n') && !newText.includes('\n')) {
    // A whole-line replacement whose old & new only share scattered characters would render as a noisy,
    // fragmented inline diff — show it as a clean whole-line replacement instead.
    if (isWholeLineRange(base.range) && !isContiguousDiff(oldText, newText)) {
      return wholeLineTarget(base.range.start.line, newText)
    }
    return charTrim(base.range, oldText, newText)
  }

  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const { prefixLines, suffixLines } = trimCommonLines(oldText, newText)
  const oldMid = oldLines.slice(prefixLines, oldLines.length - suffixLines)
  const newMid = newLines.slice(prefixLines, newLines.length - suffixLines)
  const startLine = base.range.start.line + prefixLines

  // All removed lines were common → inserting whole new line(s) before `startLine`.
  if (oldMid.length === 0) {
    return {
      range: { start: { line: startLine, column: 1 }, end: { line: startLine, column: 1 } },
      code: newMid.join('\n'),
      lineInsertion: true
    }
  }
  if (oldMid.length === 1 && newMid.length === 1 && isContiguousDiff(oldMid[0], newMid[0])) {
    const lineRange = { start: { line: startLine, column: 1 }, end: { line: startLine, column: oldMid[0].length + 1 } }
    return charTrim(lineRange, oldMid[0], newMid[0])
  }
  return {
    range: { start: { line: startLine, column: 1 }, end: { line: startLine + oldMid.length, column: 1 } },
    code: newMid.join('\n'),
    lineInsertion: false
  }
})

// The line a new statement is inserted at (after trimming), or the raw target line for a pure insertion.
const insertionLine = computed(() => {
  const target = changeTarget.value
  return target != null ? target.range.start.line : startLine.value
})

// Whether this guide inserts a brand-new line (→ open a blank line); otherwise it edits existing code in place.
const isInsertion = computed(() => {
  if (!valid.value) return false
  const target = changeTarget.value
  return target == null ? hasAddition.value : target.lineInsertion
})

// Open a blank line to type into, only for an insertion.
const blankLine = useInsertionBlankLine({
  codeEditor: codeEditorRef,
  editorCtx: editorCtxRef,
  textDocumentId: () => textDocumentId.value,
  line: () => insertionLine.value
})

const guide = computed<CodeGuide | null>(() => {
  if (!valid.value) return null
  const target = changeTarget.value
  // Replacement / deletion / inline insertion (anything that isn't a whole new line) → `change` guide.
  if (target != null && !target.lineInsertion) {
    return { kind: 'change', textDocument: textDocumentId.value, range: target.range, code: target.code }
  }
  // New-line insertion → `type` guide (opens a blank line, chip on the new line, green reference below).
  const code = target != null ? target.code : fullCode.value
  if (code.trim() === '') return null
  // Place the insertion point after the indentation that the opened line will receive.
  const column = blankLine.indent.value.length + 1
  return {
    kind: 'type',
    textDocument: textDocumentId.value,
    range: { start: { line: insertionLine.value, column }, end: { line: insertionLine.value, column } },
    code
  }
})

const { activate } = useCodeGuide({
  codeEditor: codeEditorRef,
  guide: () => guide.value,
  signature: () => {
    const g = guide.value
    if (g == null) return ''
    const code = 'code' in g ? g.code : ''
    return `${g.kind}:${JSON.stringify(g.range)}:${code}`
  },
  onBeforeShow: () => {
    if (isInsertion.value) blankLine.open()
  },
  onCleanup: () => blankLine.remove()
})
</script>

<template>
  <BlockWrapper>
    <template v-if="valid">
      <div class="p-2">
        <CodeLink :file="textDocumentId" :position="{ line: startLine, column: 1 }" @click="activate">
          {{ $t({ en: 'Make this change in the editor', zh: '在编辑器中完成这处修改' }) }}
        </CodeLink>
      </div>
      <div class="min-w-0 overflow-x-auto pb-2 pl-2">
        <div class="min-w-fit">
          <CodeView v-if="changeBase != null && changeBase.oldText !== ''" class="pr-2" mode="block" deletion>{{
            changeBase.oldText
          }}</CodeView>
          <CodeView v-if="hasAddition" class="pr-2" mode="block" addition>{{ fullCode }}</CodeView>
        </div>
      </div>
    </template>
    <div v-else class="p-2 text-center text-hint-2">
      <p>{{ $t({ en: 'Invalid code change', zh: '无效的代码变更' }) }}</p>
    </div>
  </BlockWrapper>
</template>
