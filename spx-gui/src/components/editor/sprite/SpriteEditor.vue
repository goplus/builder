<template>
  <TagNode name="editor-header">
    <EditorHeader>
      <TagNode name="ui-tabs">
        <UITabs v-model:value="selectedTab" color="sprite">
          <TagNode name="tab-code">
            <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
          </TagNode>
          <TagNode name="tab-costumes">
            <UITab value="costumes">{{ $t({ en: 'Costumes', zh: '造型' }) }}</UITab>
          </TagNode>
          <TagNode name="tab-animations">
            <UITab value="animations">{{ $t({ en: 'Animations', zh: '动画' }) }}</UITab>
          </TagNode>
        </UITabs>
      </TagNode>
      <template #extra>
        <TagNode name="code-format-button">
          <FormatButton v-if="selectedTab === 'code'" :code-file-path="sprite.codeFilePath" />
        </TagNode>
      </template>
    </EditorHeader>
  </TagNode>
  <TagNode name="code-editor">
    <CodeEditorUI v-show="selectedTab === 'code'" ref="codeEditor" :code-file-path="sprite.codeFilePath" />
  </TagNode>
  <TagNode name="costumes-editor">
    <CostumesEditor v-show="selectedTab === 'costumes'" :sprite="sprite" />
  </TagNode>
  <!-- We use v-if to prevent AnimationEditor from running in the background -->
  <TagNode name="animation-editor">
    <AnimationEditor v-if="selectedTab === 'animations'" :sprite="sprite" />
  </TagNode>
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
