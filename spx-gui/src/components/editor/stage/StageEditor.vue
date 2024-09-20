<template>
  <EditorHeader color="stage">
    <UITabs v-model:value="selectedTab" color="stage">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
      <UITab value="backdrops">{{ $t({ en: 'Backdrops', zh: '背景' }) }}</UITab>
    </UITabs>
    <template #extra>
      <FormatButton
        v-if="selectedTab === 'code' && codeEditor != null && code != null"
        :code-editor="codeEditor"
      />
      <BackdropModeSelector v-if="selectedTab === 'backdrops'" />
    </template>
  </EditorHeader>
  <CodeEditor
    v-show="selectedTab === 'code'"
    ref="codeEditor"
    :loading="code == null"
    :value="code ?? ''"
    @update:value="handleCodeUpdate"
  />
  <BackdropsEditor v-show="selectedTab === 'backdrops'" :stage="stage" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Stage } from '@/models/stage'
import { UITabs, UITab } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor from './BackdropsEditor.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import BackdropModeSelector from './BackdropModeSelector.vue'
import type { Position } from '@/models/runtime'

const props = defineProps<{
  stage: Stage
}>()

const editorCtx = useEditorCtx()
const selectedTab = ref<'code' | 'backdrops'>('code')
const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const code = computed(() => props.stage.code)

const action = {
  name: { en: 'Update stage code', zh: '修改舞台代码' },
  mergeable: true
}

function handleCodeUpdate(value: string) {
  editorCtx.project.history.doAction(action, () => props.stage.setCode(value))
}

defineExpose({
  jump(position: Position): void {
    codeEditor.value?.jump(position)
  }
})
</script>
