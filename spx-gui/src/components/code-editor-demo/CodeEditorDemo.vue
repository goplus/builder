<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-26 19:07:52
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 13:23:31
 * @FilePath: /spx-gui/src/components/code-editor-demo/CodeEditorDemo.vue
 * @Description: 
-->
<template>
  <div class="demo">
    <pre>{{ editorContent }}</pre>
    <div>
      <button @click="format">format</button>
      <button @click="insertSnippet">start snippet</button>
      <button @click="toggleReadOnly">
        {{ editorOptions.readOnly ? 'disable' : 'enable' }} readonly
      </button>
      <div v-for="(item, index) in codeArray" :key="index" @click="codeIndex = index">
        code: {{ index }}
      </div>
    </div>

    <CodeEditor
      ref="codeEditor"
      width="500px"
      height="500px"
      :editor-options="editorOptions"
      :model-value="editorContent"
      @update:model-value="onCodeChange"
    />
  </div>
</template>
<script setup lang="ts">
import CodeEditor, { onStartSnippet } from '../code-editor'
import { ref, computed } from 'vue'
let codeEditor = ref()
const editorOptions = ref({
  minimap: {
    enabled: false
  },
  readOnly: false
})
const editorContent = computed(() => {
  return codeArray.value[codeIndex.value].code
})
const codeIndex = ref(0)
const codeArray = ref([
  {
    code: 'onStart => { }'
  },
  {
    code: 'onClone => { }'
  }
])

const insertSnippet = () => {
  codeEditor.value.insertSnippet(onStartSnippet)
}

const onCodeChange = (e: string) => {
  codeArray.value[codeIndex.value].code = e
}

const toggleReadOnly = () => {
  editorOptions.value.readOnly = !editorOptions.value.readOnly
}

const format = () => {
  codeEditor.value.format()
}
</script>
<style lang="scss">
.demo {
  height: 700px;
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>
