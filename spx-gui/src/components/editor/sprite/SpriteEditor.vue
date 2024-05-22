<template>
  <EditorHeader>
    <UITabs v-model:value="selectedTab" color="sprite">
      <UITab value="code">{{ $t({ en: 'Code', zh: '代码' }) }}</UITab>
      <UITab value="costumes">{{ $t({ en: 'Costumes', zh: '造型' }) }}</UITab>
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
  <CostumesEditor v-show="selectedTab === 'costumes'" :sprite="sprite" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import type { Sprite } from '@/models/sprite'
import { UITabs, UITab } from '@/components/ui'
import CodeEditor from '../code-editor/CodeEditor.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import CostumesEditor from './CostumesEditor.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'

const props = defineProps<{
  sprite: Sprite
}>()

const editorCtx = useEditorCtx()
const selectedTab = ref<'code' | 'costumes'>('code')
const codeEditor = ref<InstanceType<typeof CodeEditor>>()
const code = useAsyncComputed(() => props.sprite.getCode())

function handleCodeUpdate(value: string) {
  editorCtx.project.history.doAction(
    { en: 'setCode', zh: 'setCode' },
    () => props.sprite.setCode(value)
  )
}
</script>
