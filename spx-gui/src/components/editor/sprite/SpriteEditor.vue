<template>
  <UICardHeader>
    <div class="header">
      {{ $t({ en: 'Code', zh: '代码' }) }}
    </div>
    <FormatButton v-if="codeEditor != null" :code-editor="codeEditor" />
  </UICardHeader>
  <CodeEditor ref="codeEditor" :value="sprite.code" @update:value="(v) => sprite.setCode(v)" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Sprite } from '@/models/sprite'
import { UICardHeader } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../FormatButton.vue'

defineProps<{
  sprite: Sprite
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
</script>

<style scoped lang="scss">
.header {
  flex: 1 1 0;
}
</style>
