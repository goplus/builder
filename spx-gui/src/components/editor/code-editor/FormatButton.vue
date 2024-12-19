<template>
  <UIButton type="boring" :loading="handleFormat.isLoading.value" @click="handleFormat.fn">
    {{ $t({ en: 'Format', zh: '格式化' }) }}
  </UIButton>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useCodeEditorCtx } from './context'
import { getTextDocumentId } from './common'

const props = defineProps<{
  codeFilePath: string
}>()

const codeEditorCtx = useCodeEditorCtx()
const handleFormat = useMessageHandle(
  () => {
    const textDocumentId = getTextDocumentId(props.codeFilePath)
    return codeEditorCtx.formatTextDocument(textDocumentId)
  },
  {
    en: 'Failed to format',
    zh: '格式化失败'
  }
)
</script>
