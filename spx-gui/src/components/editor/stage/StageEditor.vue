<template>
  <EditorHeader :color="uiVariables.color.stage.main">
    {{ $t({ en: 'Stage', zh: '舞台' }) }} / {{ $t({ en: 'Code', zh: '代码' }) }}
    <template #extra>
      <FormatButton v-if="codeEditor != null" :code-editor="codeEditor" />
    </template>
  </EditorHeader>
  <CodeEditor ref="codeEditor" :value="code ?? ''" @update:value="(v) => stage.setCode(v)" />
    <UILoading v-show="code == null" cover />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import type { Stage } from '@/models/stage'
import { useUIVariables, UILoading } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../FormatButton.vue'
import EditorHeader from '../EditorHeader.vue'

const props = defineProps<{
  stage: Stage
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const uiVariables = useUIVariables()
const code = useAsyncComputed(() => props.stage.getCode())
</script>

<style scoped lang="scss">
.header {
  flex: 1 1 0;
}
</style>
