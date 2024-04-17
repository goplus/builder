<template>
  <UIButton
    size="small"
    type="boring"
    :loading="handleFormat.isLoading.value"
    @click="handleFormat.fn"
  >
    {{ $t({ en: 'Format', zh: '格式化' }) }}
  </UIButton>
</template>

<script setup lang="ts">
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type CodeEditor from './code-editor/CodeEditor.vue'

const props = defineProps<{
  codeEditor: InstanceType<typeof CodeEditor>
}>()

const handleFormat = useMessageHandle(
  () => props.codeEditor.format(),
  { en: 'Format failed', zh: '格式化失败' }
)
</script>
