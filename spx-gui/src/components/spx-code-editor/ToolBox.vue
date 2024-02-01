<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-31 16:22:49
 * @FilePath: /builder/spx-gui/src/components/spx-code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
  <div class="toolbox">
    <n-tabs type="line" animated placement="left" style="height: 240px">
      <n-tab-pane v-for="item in completionToolbox" :key="item.label" :name="item.label" :tab="item.label">
        <n-button v-for="(snippet, index) in item.completionItems" :key="index" @click="insertCode(toRaw(snippet))"
          style="margin-top: 24px">
          {{ snippet.label }}
        </n-button>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
<script setup lang="ts">
import { monaco } from "@/plugins/code-editor/index";
import { motion_fn_completions, event_fn_completions, look_fn_completions, control_fn_completions, sound_fn_completions } from "@/components/code-editor/Snippet"
import { NButton, NTabs, NTabPane } from "naive-ui";
import { useEditorStore } from "@/store";
import { toRaw, ref } from "vue";
const store = useEditorStore();
console.log(motion_fn_completions)
let completionToolbox = ref([
  {
    label: 'event',
    completionItems: event_fn_completions
  },
  {
    label: 'look',
    completionItems: look_fn_completions
  }, {
    label: "motion",
    completionItems: motion_fn_completions
  }, {
    label: "sound",
    completionItems: sound_fn_completions
  }, {
    label: "control",
    completionItems: control_fn_completions
  }
]);
// dispatch insertCode
const insertCode = (snippet: monaco.languages.CompletionItem) => {
  console.log(snippet);
  store.insertSnippet(snippet);
};
</script>