<script setup lang="ts">
import { useSlotText } from '@/utils/vnode'
import { useMessageHandle } from '@/utils/exception'
import CodeView from '@/components/common/CodeView.vue'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/editor/code-editor/spx-code-editor'
import BlockWrapper from './common/BlockWrapper.vue'
import BlockFooter from './common/BlockFooter.vue'
import BlockActionBtn from './common/BlockActionBtn.vue'

defineProps<{
  language?: string
}>()

const editorCtxRef = useEditorCtxRef()
const codeEditorRef = useCodeEditorRef()
const code = useSlotText()

const handleInsert = useMessageHandle(
  () => {
    const editorCtx = editorCtxRef.value
    if (editorCtx == null) throw new Error('Editor context is not available')
    const codeEditorUI = codeEditorRef.value?.getAttachedUI()
    if (codeEditorUI == null) throw new Error('Code editor UI is not available')
    return editorCtx.state.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      codeEditorUI.insertBlockText(code.value)
    )
  },
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
    <div class="py-3 pl-3">
      <CodeView class="min-w-0 overflow-x-auto pr-3" :language="language" mode="block" line-numbers>
        {{ code }}
      </CodeView>
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
