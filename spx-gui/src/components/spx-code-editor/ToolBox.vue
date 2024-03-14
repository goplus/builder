<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 20:58:16
 * @FilePath: /spx-gui/src/components/spx-code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
  <div class="toolbox">
    <n-tabs type="line" add-tab-style="color:#a3a3a4" animated placement="left" style="height: 240px">
      <n-tab-pane
        v-for="item in completionToolbox"
        :key="item.label"
        :name="item.label"
        :tab="$t(`toolbox.${item.label}`)"
      >
        <n-button
          v-for="(snippet, index) in item.completionItems"
          :key="index"
          style="margin-top: 24px"
          @click="insertCode(toRaw(snippet))"
        >
          {{ snippet.label }}
        </n-button>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
<script setup lang="ts">
import {
  monaco,
  motionSnippets,
  eventSnippets,
  lookSnippets,
  controlSnippets,
  soundSnippets
} from '@/components/code-editor'
import { NButton, NTabs, NTabPane } from 'naive-ui'
import { useEditorStore } from '@/store'
import { toRaw, ref } from 'vue'
const store = useEditorStore()
console.log(motionSnippets)
let completionToolbox = ref([
  {
    label: 'event',
    completionItems: eventSnippets
  },
  {
    label: 'look',
    completionItems: lookSnippets
  },
  {
    label: 'motion',
    completionItems: motionSnippets
  },
  {
    label: 'sound',
    completionItems: soundSnippets
  },
  {
    label: 'control',
    completionItems: controlSnippets
  }
])
// dispatch insertCode
const insertCode = (snippet: monaco.languages.CompletionItem) => {
  console.log(snippet)
  store.insertSnippet(snippet)
}
</script>
<style scoped lang="scss">
.n-button {
  width: auto;
  border: 1px solid #a4a4a3;
  background: white;
  color: #333333;
  margin-right: 3px;
}

.n-tabs .n-tabs-tab{
  color:#a4a4a3;
}
</style>
