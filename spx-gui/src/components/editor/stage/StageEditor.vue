<template>
  <EditorHeader :color="uiVariables.color.stage.main">
    {{ $t({ en: 'Stage', zh: '舞台' }) }} / {{ $t({ en: 'Code', zh: '代码' }) }}
    <template #extra>
      <FormatButton v-if="codeEditor != null" :code-editor="codeEditor" />
    </template>
  </EditorHeader>
  <CodeEditor ref="codeEditor" :value="stage.code" @update:value="(v) => stage.setCode(v)" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Stage } from '@/models/stage'
import { useUIVariables } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../FormatButton.vue'
import EditorHeader from '../EditorHeader.vue'

defineProps<{
  stage: Stage
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const uiVariables = useUIVariables()
</script>

<style scoped lang="scss">
.header {
  flex: 1 1 0;
}
</style>
