<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 14:44:00
 * @FilePath: \spx-gui\src\components\spx-code-editor\SpxCodeEditor.vue
 * @Description: 
-->
<template>
  <div class="code-editor-space">
    <div class="code-button">{{ $t('component.code') }}</div>
    <n-button-group class="formatBtnGroup" size="small">
      <n-button class="formatBtn" @click="format">{{ $t('editor.format') }}</n-button>
    </n-button-group>
    <CodeEditor ref="codeEditor" :model-value="currentCode" @update:model-value="onCodeChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores'
import { NButton } from 'naive-ui'
import type { languages } from 'monaco-editor'
import { useEditorStore } from '@/stores/editor'
import CodeEditor from './code-editor'
const projectStore = useProjectStore()
const editorStore = useEditorStore()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()

const currentCode = computed(() =>
  editorStore.currentSprite ? editorStore.currentSprite.code : projectStore.project.stage.code
)

const onCodeChange = (value: string) => {
  if (editorStore.currentSprite) {
    editorStore.currentSprite.setCode(value)
  } else {
    projectStore.project.stage.setCode(value)
  }
}

const format = () => {
  codeEditor.value?.format()
}

const insertSnippet = (snippet: languages.CompletionItem) => {
  codeEditor.value?.insertSnippet(snippet)
}

defineExpose({ insertSnippet })
</script>

<style scoped>
#code-editor {
  height: 100%;
}

.code-button {
  background: #cdf5ef;
  width: 80px;
  height: auto;
  text-align: center;
  position: absolute;
  top: -2px;
  font-size: 18px;
  border: 2px solid #00142970;
  border-radius: 0 0 10px 10px;
  z-index: 2;
}

.code-editor-space {
  display: flex;
  flex-direction: column;
  height: calc(100% - 44px);
  position: relative;
  background: white;
  padding: 4px;
}

.formatBtnGroup {
  z-index: 99;
  right: 20px;
  position: absolute;

  .n-button {
    background: #00000000;
    color: #001429;
    border: 1px solid black;
  }

  .n-button:hover {
    background: #ed729e20;
  }
}

.action,
.sprite {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}
</style>
