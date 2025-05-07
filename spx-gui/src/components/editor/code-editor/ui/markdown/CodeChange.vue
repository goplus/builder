<script setup lang="ts">
import { computed } from 'vue'
import { useSlotText } from '@/utils/vnode'
import { useMessageHandle, ActionException } from '@/utils/exception'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { type Range } from '../../common'
import { useCodeEditorCtx } from '../../context'
import CodeLink from '../../CodeLink.vue'
import BlockWrapper from './common/BlockWrapper.vue'
import BlockFooter from './common/BlockFooter.vue'
import BlockActionBtn from './common/BlockActionBtn.vue'
import CodeView from './CodeView.vue'

const props = defineProps<{
  language?: string
  /** Text document URI, e.g., `file:///NiuXiaoQi.spx` */
  file: string
  /** Position (line number) to do change */
  line: string
  /** Line count to remove. No line will be removed if not provided */
  removeLineCount?: string
}>()

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

const childrenText = useSlotText()
const codeToAdd = computed(() => {
  // strip leading line break to keep consistent with markdown code block
  let code = childrenText.value.replace(/^\n/, '')
  // add trailing line break, as the code is always inserted as lines
  if (!code.endsWith('\n')) code = code + '\n'
  return code
})

const target = computed(() => {
  const textDocument = codeEditorCtx.getTextDocument({ uri: props.file })
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
    if (target.value == null) return
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
          <CodeView class="code" :language="language" mode="block" deletion>{{ codeToDelete }}</CodeView>
          <CodeView class="code" :language="language" mode="block" addition>{{ codeToAdd }}</CodeView>
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
