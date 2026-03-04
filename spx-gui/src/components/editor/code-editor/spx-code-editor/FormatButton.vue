<template>
  <UIButton
    v-radar="{ name: 'Format button', desc: 'Click to format the code' }"
    color="boring"
    :loading="handleFormat.isLoading.value"
    @click="handleFormat.fn"
  >
    {{ $t({ en: 'Format', zh: '格式化' }) }}
  </UIButton>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useCodeEditor } from './context'
import { getTextDocumentId } from '../xgo-code-editor'

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
