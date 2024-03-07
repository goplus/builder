<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 12:15:54
 * @FilePath: \spx-gui\src\components\spx-code-editor\SpxCodeEditor.vue
 * @Description: 
-->
<template>
  <div class="code-editor-space">
    <div class="code-button">{{ $t('component.code') }}</div>
    <n-button-group class="formatBtnGroup" size="small">
      <n-button class="formatBtn" @click="format">{{ $t('editor.format') }}</n-button>
    </n-button-group>
    <CodeEditor ref="code_editor" :model-value="currentCode" @update:model-value="onCodeChange" />
  </div>
</template>

<script setup lang="ts">
import CodeEditor, { monaco } from '@/components/code-editor'
import { ref, computed } from 'vue'
import { EditContentType, useEditorStore, useProjectStore } from '@/store'
import { useSpriteStore } from '@/store/modules/sprite'
import { NButton } from 'naive-ui'
const projectStore = useProjectStore()
const spriteStore = useSpriteStore()
const editorStore = useEditorStore()
const code_editor = ref()

// watch the current sprite and set it's code to editor
const currentCode = computed(() => {
  if (editorStore.editContentType === EditContentType.Sprite) {
    return spriteStore.current?.code || ''
  } else {
    return projectStore.project.entryCode
      ? projectStore.project.entryCode
      : projectStore.project.defaultEntryCode
  }
})

// Listen for editor value change, sync to sprite store
const onCodeChange = (value: string) => {
  if (editorStore.editContentType === EditContentType.Sprite) {
    if (spriteStore.current) {
      spriteStore.current.code = value
    }
  } else {
    if (projectStore.project.entryCode || (projectStore.project.defaultEntryCode !== value)) {
      projectStore.project.entryCode = value
    }
  }
}



const format = () => {
  code_editor.value.format()
}

// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
  code_editor.value.insertSnippet(snippet)
}

// register insertSnippet
editorStore.$onAction(({ name, args, after }) => {
  after(() => {
    if (name === 'insertSnippet') {
      const snippet = args[0] as monaco.languages.CompletionItem
      triggerInsertSnippet(snippet)
    }
  })
})
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
