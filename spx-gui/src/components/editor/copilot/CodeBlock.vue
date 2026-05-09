<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import BaseCodeBlock from '@/components/copilot/markdown-elements/CodeBlock.vue'
import BlockActionBtn from '@/components/copilot/markdown-elements/common/BlockActionBtn.vue'
import { useEditorCtxRef } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorRef } from '@/components/editor/spx-code-editor'

defineProps<{
  language?: string
}>()

const editorCtxRef = useEditorCtxRef()
const codeEditorRef = useCodeEditorRef()

const handleInsert = useMessageHandle(
  (code: string) => {
    const editorCtx = editorCtxRef.value
    if (editorCtx == null) throw new Error('Editor context is not available')
    const codeEditorUI = codeEditorRef.value?.getAttachedUI()
    if (codeEditorUI == null) throw new Error('Code editor UI is not available')
    return editorCtx.state.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      codeEditorUI.insertBlockText(code)
    )
  },
  { en: 'Failed to insert code', zh: '插入代码失败' }
).fn
</script>

<template>
  <BaseCodeBlock :language="language">
    <slot></slot>
    <template #actions="{ code }">
      <BlockActionBtn icon="insert" @click="handleInsert(code)">
        {{ $t({ en: 'Insert', zh: '插入' }) }}
      </BlockActionBtn>
    </template>
  </BaseCodeBlock>
</template>
