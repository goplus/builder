<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-26 17:52:20
 * @FilePath: /builder/spx-gui/src/components/code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
  <div class="toolbox">
    <n-tabs type="line" animated placement="left" style="height: 240px">
      <n-tab-pane
        v-for="item in store.completionToolbox"
        :key="item.label"
        :name="item.label"
        :tab="item.label"
      >
        <n-button
          v-for="(snippet, index) in item.completionItems"
          :key="index"
          @click="insertCode(toRaw(snippet))"
          style="margin-top: 16px"
        >
          {{ snippet.label }}
        </n-button>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
<script setup lang="ts">
import { monaco } from "@/plugins/code-editor/index";
import { NButton, NTabs, NTabPane } from "naive-ui";
import { useEditorStore } from "@/store";
import { toRaw } from "vue";
const store = useEditorStore();

// dispatch insertCode
const insertCode = (snippet: monaco.languages.CompletionItem) => {
  console.log(snippet);
  store.insertSnippet(snippet);
};
</script>
<style scoped lang="scss">
.n-button{
  width: auto;
  border: 1px solid #FF81A7;
  background: #ed729d10;
  color:#333333;
  margin-right:3px;
}
</style>