<script setup lang="ts">
import { computed } from 'vue'
import { UICard, UICardHeader } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'

const editorCtx = useEditorCtx()
const runtime = computed(() => editorCtx.runtime)
</script>

<template>
  <UICard class="console-panel">
    <UICardHeader>
      {{ $t({ en: 'Console', zh: '控制台' }) }}
    </UICardHeader>
    <ul class="output-container">
      <li v-for="(output, i) in runtime.outputs" :key="i" class="output">
        {{ output.message }}
      </li>
    </ul>
  </UICard>
</template>

<style lang="scss" scoped>
.console-panel {
  display: flex;
  flex-direction: column;
}
.output-container {
  flex: 1 1 0;
  overflow-y: auto;
}
</style>
