<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 13:11:59
 * @FilePath: /spx-gui/src/components/spx-code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
  <div class="toolbox">
    <n-tabs type="line" animated placement="left" style="height: 240px">
      <n-tab-pane v-for="item in completionToolbox" :key="item.label" :name="item.label" :tab="$t(`toolbox.${item.label}`)">
        <n-button v-for="(snippet, index) in item.completionItems" :key="index" @click="insertCode(toRaw(snippet))"
          style="margin-top: 24px">
          {{ snippet.label }}
        </n-button>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
<script setup lang="ts">
import { monaco, motionSnippets, eventSnippets, lookSnippets, controlSnippets, soundSnippets } from "@/components/code-editor"
import { NButton, NTabs, NTabPane } from "naive-ui";
import { useEditorStore } from "@/store";
import { toRaw, ref } from "vue";
const store = useEditorStore();
console.log(motionSnippets)
let completionToolbox = ref([
  {
    label: 'event',
    completionItems: eventSnippets
  },
  {
    label: 'look',
    completionItems: lookSnippets
  }, {
    label: "motion",
    completionItems: motionSnippets
  }, {
    label: "sound",
    completionItems: soundSnippets
  }, {
    label: "control",
    completionItems: controlSnippets
  }
]);
// dispatch insertCode
const insertCode = (snippet: monaco.languages.CompletionItem) => {
  console.log(snippet);
  store.insertSnippet(snippet);
};
</script>
<style scoped lang="scss">
.n-button {
  width: auto;
  border: 1px solid #FF81A7;
  background: #ed729d10;
  color: #333333;
  margin-right: 3px;
}
</style>