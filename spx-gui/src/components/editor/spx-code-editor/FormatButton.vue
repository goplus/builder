<template>
  <UITooltip placement="top-end">
    <template #trigger>
      <UIButton
        v-radar="{ name: 'Format button', desc: 'Click to format the code' }"
        type="neutral"
        shape="square"
        icon="format"
        :aria-label="$t({ en: 'Format', zh: '格式化' })"
        :loading="handleFormat.isLoading.value"
        @click="handleFormat.fn"
      ></UIButton>
    </template>
    {{ $t({ en: 'Format', zh: '格式化' }) }}
  </UITooltip>
</template>

<script setup lang="ts">
import { UIButton, UITooltip } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getTextDocumentId, useCodeEditor } from '@/components/xgo-code-editor'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  codeFilePath: string
}>()

const editorCtx = useEditorCtx()
const codeEditor = useCodeEditor()
const handleFormat = useMessageHandle(
  () =>
    editorCtx.state.history.doAction({ name: { en: 'Format code', zh: '格式化代码' } }, () =>
      codeEditor.formatTextDocument(getTextDocumentId(props.codeFilePath))
    ),
  {
    en: 'Failed to format, please check the code',
    zh: '格式化失败，请检查代码'
  }
)
</script>
