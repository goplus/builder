<template>
  <EditorHeader :color="uiVariables.color.sprite.main">
    <AssetName>{{ sprite.name }}</AssetName>
    &nbsp;/ {{ $t({ en: 'Code', zh: '代码' }) }}
    <template #extra>
      <FormatButton v-if="codeEditor != null" :code-editor="codeEditor" />
    </template>
  </EditorHeader>
  <CodeEditor ref="codeEditor" :value="sprite.code" @update:value="(v) => sprite.setCode(v)" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Sprite } from '@/models/sprite'
import { useUIVariables } from '@/components/ui'
import AssetName from '@/components/asset/AssetName.vue'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../FormatButton.vue'
import EditorHeader from '../EditorHeader.vue'

defineProps<{
  sprite: Sprite
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const uiVariables = useUIVariables()
</script>

<style scoped lang="scss">
.header {
  flex: 1 1 0;
}
</style>
