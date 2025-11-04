<script lang="ts">
import { z } from 'zod'
import { codeFilePathSchema } from '../common'

export const tagName = 'code-change'

export const isRaw = true

export const description = 'Display a modification based on the existing code.'

export const detailedDescription = `Display a modification based on the existing code. For example,

<code-change file="NiuXiaoQi.spx" line="10" remove-line-count="2">
onStart => {
	say "Hello, world!"
}
</code-change>

will display a code change that removes line 10 & 11, then adds the new code content. The user can then apply the change by clicking the "Apply" button.`

export const attributes = z.object({
  file: codeFilePathSchema,
  line: z.string().describe('Position (line number) to do change, 1-based'),
  removeLineCount: z.string().optional().describe('Line count to remove. No line will be removed if not provided')
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useSlotTextFixed } from '@/utils/vnode'
import { useMessageHandle, ActionException } from '@/utils/exception'
import CodeView from '@/components/common/CodeView.vue'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import CodeLink from '@/components/editor/code-editor/CodeLink.vue'
import { getTextDocumentId, type Range } from '@/components/editor/code-editor/common'
import { useCodeEditorCtxRef } from '@/components/editor/code-editor/context'
import BlockWrapper from './common/BlockWrapper.vue'
import BlockFooter from './common/BlockFooter.vue'
import BlockActionBtn from './common/BlockActionBtn.vue'

const props = defineProps<{
  /** Code file path, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Position (line number) to do change */
  line: string
  /** Line count to remove. No line will be removed if not provided */
  removeLineCount?: string
}>()

const editorCtxRef = useEditorCtxRef()
const codeEditorCtxRef = useCodeEditorCtxRef()

const childrenText = useSlotTextFixed()
const codeToAdd = computed(() => {
  // strip leading line break to keep consistent with markdown code block
  let code = childrenText.value.replace(/^\n/, '')
  // add trailing line break, as the code is always inserted as lines
  if (!code.endsWith('\n')) code = code + '\n'
  return code
})

const target = computed(() => {
  const codeEditorCtx = codeEditorCtxRef.value
  if (codeEditorCtx == null) return null
  const textDocument = codeEditorCtx.mustEditor().getTextDocument(getTextDocumentId(props.file))
  if (textDocument == null) return null
  const startLine = parseInt(props.line, 10)
  const removeLineCount = props.removeLineCount == null ? 0 : parseInt(props.removeLineCount, 10)
  if (isNaN(startLine) || isNaN(removeLineCount)) return null
  const endLine = startLine + removeLineCount
  const range: Range = {
    start: { line: startLine, column: 1 },
    end: { line: endLine, column: 1 }
  }
  return { textDocument, range }
})

// We don't want `codeToDelete` to change when text-document edited.
// So we are not using `computed` here.
const codeToDelete = (() => {
  if (target.value == null) return ''
  const { textDocument, range } = target.value
  return textDocument.getValueInRange(range)
})()

const handleApply = useMessageHandle(
  async () => {
    if (target.value == null) throw new Error('Target is not available')
    const editorCtx = editorCtxRef.value
    if (editorCtx == null) throw new Error('Editor context is not available')
    const { textDocument, range } = target.value
    if (textDocument.getValueInRange(range) !== codeToDelete)
      throw new ActionException(null, {
        en: 'The original code has changed',
        zh: '原代码已被更改'
      })
    await editorCtx.project.history.doAction({ name: { en: 'Apply code change', zh: '应用代码更改' } }, () =>
      textDocument.pushEdits([{ range, newText: codeToAdd.value }])
    )
  },
  { en: 'Failed to apply code change', zh: '应用代码更改失败' }
).fn
</script>

<template>
  <BlockWrapper>
    <template v-if="target != null">
      <div class="header">
        <CodeLink class="link" :file="target.textDocument.id" :range="target.range" />
      </div>
      <div class="body">
        <div class="code-wrapper">
          <!-- TODO: Consider using [transformerNotationDiff](https://shiki.style/packages/transformers#transformernotationdiff) instead -->
          <CodeView class="code" mode="block" deletion>{{ codeToDelete }}</CodeView>
          <CodeView class="code" mode="block" addition>{{ codeToAdd }}</CodeView>
        </div>
      </div>
      <BlockFooter>
        <BlockActionBtn icon="apply" @click="handleApply">
          {{ $t({ en: 'Apply', zh: '应用' }) }}
        </BlockActionBtn>
      </BlockFooter>
    </template>
    <div v-else class="invalid">
      <p>{{ $t({ en: 'Invalid code change', zh: '无效的代码变更' }) }}</p>
    </div>
  </BlockWrapper>
</template>

<style lang="scss" scoped>
.header {
  padding: 8px;
}
.body {
  padding: 0 0 8px 8px;
  min-width: 0;
  overflow-x: auto;
}
.code-wrapper {
  min-width: fit-content;
}
.code {
  padding-right: 8px;
}
.invalid {
  padding: 8px;
  text-align: center;
  color: var(--ui-color-hint-2);
}
</style>
