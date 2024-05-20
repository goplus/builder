<template>
  <EditorHeader>
    <UITabs value="code" color="sprite">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
    </UITabs>
    <template #extra>
      <FormatButton v-if="codeEditor != null" :code-editor="codeEditor" />
    </template>
  </EditorHeader>
  <CodeEditor ref="codeEditor" :value="code ?? ''" @update:value="(v) => sprite.setCode(v)" />
  <UILoading v-show="code == null" cover />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import type { Sprite } from '@/models/sprite'
import { UILoading, UITabs, UITab } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../FormatButton.vue'
import EditorHeader from '../EditorHeader.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const code = useAsyncComputed(() => props.sprite.getCode())
</script>

<style scoped lang="scss">
.header {
  flex: 1 1 0;
}
</style>
