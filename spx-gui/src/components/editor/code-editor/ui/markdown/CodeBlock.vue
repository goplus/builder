<script setup lang="ts">
import { useSlotText } from '@/utils/vnode'
import { useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import BlockWrapper from './common/BlockWrapper.vue'
import BlockFooter from './common/BlockFooter.vue'
import BlockActionBtn from './common/BlockActionBtn.vue'
import CodeView from './CodeView.vue'

defineProps<{
  language?: string
}>()

const editorCtx = useEditorCtx()
const codeEditorUICtx = useCodeEditorUICtx()
const code = useSlotText()

const handleInsert = useMessageHandle(
  () =>
    editorCtx.project.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      codeEditorUICtx.ui.insertText(code.value)
    ),
  { en: 'Failed to insert code', zh: '插入代码失败' }
).fn

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(code.value),
  { en: 'Failed to copy link to clipboard', zh: '复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '已复制到剪贴板' }
).fn
</script>

<template>
  <BlockWrapper>
    <div class="body">
      <CodeView class="code" :language="language" mode="block" line-numbers>{{ code }}</CodeView>
    </div>
    <BlockFooter>
      <BlockActionBtn icon="insert" @click="handleInsert">
        {{ $t({ en: 'Insert', zh: '插入' }) }}
      </BlockActionBtn>
      <BlockActionBtn icon="copy" @click="handleCopy">
        {{ $t({ en: 'Copy', zh: '复制' }) }}
      </BlockActionBtn>
    </BlockFooter>
  </BlockWrapper>
</template>

<style lang="scss" scoped>
.body {
  padding: 12px 0 12px 12px;
}
.code {
  padding-right: 12px;
  min-width: 0;
  overflow-x: auto;
}
</style>
