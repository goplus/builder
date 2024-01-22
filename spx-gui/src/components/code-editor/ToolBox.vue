<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-22 14:35:13
 * @FilePath: /builder/spx-gui/src/components/code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
    <div class="toolbox">
        <n-tabs type="line" animated placement="left" style="height: 240px;">
            <n-tab-pane v-for="item in store.completionToolbox" :key="item.label" :name="item.label" :tab="item.label">
                <n-button  v-for="(snippet,index) in item.completionItems" :key="index"
                    @click="insertCode(toRaw(snippet))" style="margin-top: 24px;">{{ snippet.label
                    }}</n-button>
            </n-tab-pane>
        </n-tabs>
    </div>
</template>
<script setup lang="ts">
import { monaco } from "@/plugins/code-editor/index"
import { NButton, NTabs, NTabPane } from 'naive-ui';
import { useEditorStore } from "@/store"
import { toRaw } from 'vue';
const store = useEditorStore();

// dispatch insertCode 
const insertCode = (snippet: monaco.languages.CompletionItem) => {
    console.log(snippet)
    store.insertSnippet(snippet)
}
</script>