<template>
  <EditorHeader color="stage">
    <UITabs v-model:value="selectedTab" color="stage">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
      <UITab value="widgets">{{ $t({ en: 'Widgets', zh: '控件' }) }}</UITab>
      <UITab value="backdrops">{{ $t({ en: 'Backdrops', zh: '背景' }) }}</UITab>
    </UITabs>
    <template #extra>
      <FormatButton v-if="selectedTab === 'code'" :code-file-path="stage.codeFilePath" />
      <BackdropModeSelector v-if="selectedTab === 'backdrops'" />
    </template>
  </EditorHeader>
  <CodeEditorUI v-show="selectedTab === 'code'" ref="codeEditor" :code-file-path="stage.codeFilePath" />
  <WidgetsEditor v-if="selectedTab === 'widgets'" />
  <BackdropsEditor v-if="selectedTab === 'backdrops'" />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { Stage } from '@/models/stage'
import { UITabs, UITab } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CodeEditorUI from '../code-editor/ui/CodeEditorUI.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor from './backdrop/BackdropsEditor.vue'
import WidgetsEditor from './widget/WidgetsEditor.vue'
import BackdropModeSelector from './backdrop/BackdropModeSelector.vue'

defineProps<{
  stage: Stage
}>()

const editorCtx = useEditorCtx()

const selectedTab = ref<'code' | 'widgets' | 'backdrops'>('code')
watchEffect(() => {
  if (editorCtx.project.stage.selectedWidget != null) {
    selectedTab.value = 'widgets'
  }
})
</script>
