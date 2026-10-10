<script lang="ts">
import { z } from 'zod'
import { codeFilePathSchema } from '@/components/copilot/common'

export const tagName = 'code-drag-hint'

export const isRaw = true

export const description = 'Guide the user to drag an API reference item into a specific location in the editor.'

export const detailedDescription = `Guide the user to drag a draggable API reference item (from the API reference panel) \
into a specific location in the editor. It opens a gap at the target line and draws a translucent orange indicator \
showing where to drop, and also highlights the matching item in the API reference panel automatically. This element \
does NOT modify the code; the user performs the drag themselves.

IMPORTANT: dragging an item from the API reference panel only INSERTS a new line — it CANNOT replace or overwrite \
existing code. So use <code-drag-hint> only to ADD a brand-new statement. Never instruct the user to drag an item to \
"replace" / "overwrite" existing code. To change or replace existing code, use <code-change-hint> instead (the user edits it \
by hand). Prefer <code-drag-hint> over <code-type-hint> when adding a new statement that exists as a draggable item, \
since dragging is the easiest way for the user to insert code. The slot content should be the expected code. For example,

<code-drag-hint file="NiuXiaoQi.spx" line="10">
say "Hello!"
</code-drag-hint>

opens a drop target at line 10 of "NiuXiaoQi.spx". The hint disappears once the user has dropped the block.`

export const attributes = z.object({
  file: codeFilePathSchema,
  line: z.string().describe('Line number where the block should be dropped, 1-based')
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useSlotText } from '@/utils/vnode'
import CodeView from '@/components/common/CodeView.vue'
import { CodeLink, getTextDocumentId, useCodeEditorRef, type CodeGuide } from '@/components/editor/spx-code-editor'
import BlockWrapper from '@/components/copilot/markdown-elements/common/BlockWrapper.vue'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeGuide, useInsertionBlankLine } from './use-code-guide'

const props = defineProps<{
  /** Code file path, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Line number where the block should be dropped */
  line: string
}>()

const codeEditorRef = useCodeEditorRef()
const editorCtxRef = useEditorCtxRef()
const childrenText = useSlotText()

const code = computed(() => childrenText.value.replace(/^\n/, '').replace(/\n+$/, ''))

const textDocumentId = computed(() => getTextDocumentId(props.file))

const startLine = computed(() => parseInt(props.line, 10))

// Open a pre-indented blank line at the target so the dropped block lands on a real line with the right
// indentation — the same line the hint marks. The line is removed again if the user drops nothing into it.
const blankLine = useInsertionBlankLine({
  codeEditor: codeEditorRef,
  editorCtx: editorCtxRef,
  textDocumentId: () => textDocumentId.value,
  line: () => startLine.value
})

const guide = computed<CodeGuide | null>(() => {
  const codeEditor = codeEditorRef.value
  if (codeEditor == null || isNaN(startLine.value)) return null
  if (codeEditor.getTextDocument(textDocumentId.value) == null) return null
  // Anchor after the indentation the opened line receives, matching where the dropped code will land.
  const column = blankLine.indent.value.length + 1
  return {
    kind: 'drag',
    textDocument: textDocumentId.value,
    range: { start: { line: startLine.value, column }, end: { line: startLine.value, column } },
    code: code.value
  }
})

const { activate } = useCodeGuide({
  codeEditor: codeEditorRef,
  guide: () => guide.value,
  signature: () => `drag:${startLine.value}:${code.value}`,
  onBeforeShow: blankLine.open,
  onCleanup: blankLine.remove
})
</script>

<template>
  <BlockWrapper>
    <template v-if="guide != null">
      <div class="p-2">
        <CodeLink :file="textDocumentId" :position="{ line: startLine, column: 1 }" @click="activate">
          {{ $t({ en: 'Drag the block to this location', zh: '把积木拖到这个位置' }) }}
        </CodeLink>
      </div>
      <div v-if="code !== ''" class="min-w-0 overflow-x-auto pb-2 pl-2">
        <div class="min-w-fit">
          <CodeView class="pr-2" mode="block" addition>{{ code }}</CodeView>
        </div>
      </div>
    </template>
    <div v-else class="p-2 text-center text-hint-2">
      <p>{{ $t({ en: 'Invalid code hint', zh: '无效的代码提示' }) }}</p>
    </div>
  </BlockWrapper>
</template>
