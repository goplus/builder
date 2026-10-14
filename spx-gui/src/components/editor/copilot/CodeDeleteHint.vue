<script lang="ts">
import { z } from 'zod'
import { codeFilePathSchema } from '@/components/copilot/common'

export const tagName = 'code-delete-hint'

export const isRaw = false

export const description = 'Guide the user to delete a piece of existing code.'

export const detailedDescription = `Guide the user to delete a piece of existing code by highlighting it in red in the editor. \
Like the other hint elements, this does NOT modify the code itself — it only marks which lines the user should remove, \
and the user deletes them. (To replace code, use <code-change-hint>, which shows the deletion and the new code together \
and guides the user to make the edit themselves.) \
To guide the user to change code, combine this with <code-type-hint>: mark the old code to delete here, then show the \
new code to type. For example,

<code-delete-hint file="NiuXiaoQi.spx" line="10" remove-line-count="2" />

highlights line 10 & 11 of "NiuXiaoQi.spx" in red, indicating the user should delete them. \
The hint disappears once the user has deleted the highlighted code.`

export const attributes = z.object({
  file: codeFilePathSchema,
  line: z.string().describe('Position (line number) to delete from, 1-based'),
  'remove-line-count': z.string().describe('Number of lines to delete')
})
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CodeView from '@/components/common/CodeView.vue'
import {
  CodeLink,
  getTextDocumentId,
  useCodeEditorRef,
  type CodeGuide,
  type Range
} from '@/components/editor/spx-code-editor'
import BlockWrapper from '@/components/copilot/markdown-elements/common/BlockWrapper.vue'
import { useCodeGuide } from './use-code-guide'

const props = defineProps<{
  /** Code file path, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Position (line number) to delete from */
  line: string
  /** Number of lines to delete */
  removeLineCount: string
}>()

const codeEditorRef = useCodeEditorRef()
const textDocumentId = computed(() => getTextDocumentId(props.file))

const range = computed<Range | null>(() => {
  const startLine = parseInt(props.line, 10)
  const removeLineCount = parseInt(props.removeLineCount, 10)
  if (isNaN(startLine) || isNaN(removeLineCount) || removeLineCount <= 0) return null
  return {
    start: { line: startLine, column: 1 },
    end: { line: startLine + removeLineCount, column: 1 }
  }
})

const guide = computed<CodeGuide | null>(() => {
  const codeEditor = codeEditorRef.value
  if (codeEditor == null || range.value == null) return null
  if (codeEditor.getTextDocument(textDocumentId.value) == null) return null
  return { kind: 'delete', textDocument: textDocumentId.value, range: range.value }
})

// Snapshot the code to delete as soon as the document is available, then freeze it (stop watching) so the
// red preview doesn't change as the user edits. Capturing during setup can be too early — the editor ref
// may still be null at that point, which would leave the preview permanently blank.
const codeToDelete = ref('')
const stopCapture = watch(
  () => codeEditorRef.value?.getTextDocument(textDocumentId.value),
  (textDocument) => {
    if (textDocument == null || range.value == null) return
    codeToDelete.value = textDocument.getValueInRange(range.value)
    stopCapture()
  },
  { immediate: true }
)

const { activate } = useCodeGuide({
  codeEditor: codeEditorRef,
  guide: () => guide.value,
  signature: () => `delete:${JSON.stringify(range.value)}`
})
</script>

<template>
  <BlockWrapper>
    <template v-if="guide != null">
      <div class="p-2">
        <CodeLink :file="textDocumentId" :range="guide.range" @click="activate">
          {{ $t({ en: 'Delete the highlighted code', zh: '删除编辑器中标红的代码' }) }}
        </CodeLink>
      </div>
      <div v-if="codeToDelete !== ''" class="min-w-0 overflow-x-auto pb-2 pl-2">
        <div class="min-w-fit">
          <CodeView class="pr-2" mode="block" deletion>{{ codeToDelete }}</CodeView>
        </div>
      </div>
    </template>
    <div v-else class="p-2 text-center text-hint-2">
      <p>{{ $t({ en: 'Invalid code hint', zh: '无效的代码提示' }) }}</p>
    </div>
  </BlockWrapper>
</template>
