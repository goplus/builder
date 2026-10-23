<script lang="ts">
import { z } from 'zod'
import { codeFilePathSchema } from '@/components/copilot/common'

export const tagName = 'code-type-hint'

export const isRaw = true

export const description = 'Guide the user to manually type a piece of code at a specific location.'

export const detailedDescription = `Guide the user to manually type a piece of code at a specific location in the editor. \
An empty line is opened at the target with a "Type the code here" chip, and the given code is shown as a green \
reference below; the user types it themselves. This element does NOT write the code for the user — it only prepares an \
empty line and shows what to type. (That empty line is a temporary scaffold: it is undoable and is removed \
automatically if the user does not type anything into it.) Use this when teaching the user to write a brand-new line \
of code by hand. For example,

<code-type-hint file="NiuXiaoQi.spx" line="10">
onClick => {
	say "Hello!"
}
</code-type-hint>

guides the user to type the code at line 10 of "NiuXiaoQi.spx". The hint disappears once the user has typed the code. \
NOTE: to MODIFY existing code, use <code-change-hint> instead; this element is only for typing brand-new code.`

export const attributes = z.object({
  file: codeFilePathSchema,
  line: z.string().describe('Line number where the user should type the code, 1-based')
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
  /** Line number where the user should type the code */
  line: string
}>()

const codeEditorRef = useCodeEditorRef()
const editorCtxRef = useEditorCtxRef()
const childrenText = useSlotText()

const code = computed(() => {
  // strip leading line break to keep consistent with markdown code block
  let c = childrenText.value.replace(/^\n/, '')
  if (!c.endsWith('\n')) c = c + '\n'
  return c
})

const textDocumentId = computed(() => getTextDocumentId(props.file))
const startLine = computed(() => parseInt(props.line, 10))

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
  // Place the insertion point after the indentation that the opened line will receive.
  const column = blankLine.indent.value.length + 1
  return {
    kind: 'type',
    textDocument: textDocumentId.value,
    range: { start: { line: startLine.value, column }, end: { line: startLine.value, column } },
    code: code.value
  }
})

const { activate } = useCodeGuide({
  codeEditor: codeEditorRef,
  guide: () => guide.value,
  signature: () => `type:${startLine.value}:${code.value}`,
  onBeforeShow: blankLine.open,
  onCleanup: blankLine.remove
})
</script>

<template>
  <BlockWrapper>
    <template v-if="guide != null">
      <div class="p-2">
        <CodeLink :file="textDocumentId" :position="{ line: startLine, column: 1 }" @click="activate">
          {{ $t({ en: 'Type this code in the editor', zh: '在编辑器中手动输入这段代码' }) }}
        </CodeLink>
      </div>
      <div class="min-w-0 overflow-x-auto pb-2 pl-2">
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
