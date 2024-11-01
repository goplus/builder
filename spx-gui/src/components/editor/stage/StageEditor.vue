<template>
  <EditorHeader color="stage">
    <UITabs v-model:value="selectedTab" color="stage">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
      <UITab value="widgets">{{ $t({ en: 'Widgets', zh: '控件' }) }}</UITab>
      <UITab value="backdrops">{{ $t({ en: 'Backdrops', zh: '背景' }) }}</UITab>
    </UITabs>
    <template #extra>
      <FormatButton v-if="selectedTab === 'code' && codeEditor != null && code != null" :code-editor="codeEditor" />
      <BackdropModeSelector v-if="selectedTab === 'backdrops'" />
    </template>
  </EditorHeader>
  <CodeEditor
    v-show="selectedTab === 'code'"
    ref="codeEditor"
    :loading="code == null"
    :file="stage.codeFilePath"
    :value="code ?? ''"
    @update:value="handleCodeUpdate"
  />
  <WidgetsEditor v-if="selectedTab === 'widgets'" />
  <BackdropsEditor v-if="selectedTab === 'backdrops'" />
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { Stage } from '@/models/stage'
import { UITabs, UITab } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor from './backdrop/BackdropsEditor.vue'
import WidgetsEditor from './widget/WidgetsEditor.vue'
import BackdropModeSelector from './backdrop/BackdropModeSelector.vue'

const props = defineProps<{
  stage: Stage
}>()

const editorCtx = useEditorCtx()

const selectedTab = ref<'code' | 'widgets' | 'backdrops'>('code')
watchEffect(() => {
  if (editorCtx.project.stage.selectedWidget != null) {
    selectedTab.value = 'widgets'
  }
})

const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const code = computed(() => props.stage.code)

// We define `codeUpdateAction` outside of `handleCodeUpdate` to keep reference-equal for `mergeable`, see details in project history
const codeUpdateAction = {
  name: { en: 'Update stage code', zh: '修改舞台代码' },
  mergeable: true
}
function handleCodeUpdate(value: string) {
  editorCtx.project.history.doAction(codeUpdateAction, () => props.stage.setCode(value))
}
</script>
