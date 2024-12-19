<template>
  <EditorHeader>
    <UITabs v-model:value="selectedTab" color="sprite">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
      <UITab value="costumes">{{ $t({ en: 'Costumes', zh: '造型' }) }}</UITab>
      <UITab value="animations">{{ $t({ en: 'Animations', zh: '动画' }) }}</UITab>
    </UITabs>
    <template #extra>
      <FormatButton v-if="selectedTab === 'code'" :code-file-path="sprite.codeFilePath" />
    </template>
  </EditorHeader>
  <CodeEditorUI v-show="selectedTab === 'code'" ref="codeEditor" :code-file-path="sprite.codeFilePath" />
  <CostumesEditor v-show="selectedTab === 'costumes'" :sprite="sprite" />
  <!-- We use v-if to prevent AnimationEditor from running in the background -->
  <AnimationEditor v-if="selectedTab === 'animations'" :sprite="sprite" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Sprite } from '@/models/sprite'
import { UITabs, UITab } from '@/components/ui'
import CodeEditorUI from '../code-editor/ui/CodeEditorUI.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import CostumesEditor from './CostumesEditor.vue'
import AnimationEditor from './AnimationEditor.vue'

defineProps<{
  sprite: Sprite
}>()

const selectedTab = ref<'code' | 'costumes' | 'animations'>('code')
</script>
