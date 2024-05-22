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
import { ref } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import type { Stage } from '@/models/stage'
import { UITabs, UITab } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor from './BackdropsEditor.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  stage: Stage
}>()

const editorCtx = useEditorCtx()
const selectedTab = ref<'code' | 'backdrops'>('code')
const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const code = useAsyncComputed(() => props.stage.getCode())

function handleCodeUpdate(value: string) {
  editorCtx.project.history.doAction(
    { en: 'setCode', zh: 'setCode' },
    () => props.stage.setCode(value)
  )
}
</script>
