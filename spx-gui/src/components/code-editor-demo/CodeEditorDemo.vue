<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-26 19:07:52
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-01 17:28:18
 * @FilePath: /builder/spx-gui/src/components/code-editor-demo/CodeEditorDemo.vue
 * @Description: 
-->
<template>
    <div class="demo">
        <pre>{{ editorContent }}</pre>
        <div>
            <button @click="format">format</button>
            <button @click="insertSnippet">start snippet</button>
            <div v-for="(item, index) in codeArray" @click="codeIndex = index"> code: {{ index }} </div>
        </div>

        <CodeEditor width="500px" height="500px" ref="codeEditor"
            :editor-options="{ minimap: { enabled: false }, readOnly: false }" :model-value="editorContent"
            @update:model-value="onCodeChange" />
    </div>
</template>
<script setup lang="ts">
import CodeEditor, { onStartSnippet } from "../code-editor/CodeEditor"
import { ref, computed } from "vue"
let codeEditor = ref();
const editorContent = computed(() => {
    return codeArray.value[codeIndex.value].code;
})
const codeIndex = ref(0);
const codeArray = ref([{
    code: "onStart => { }",
}, {
    code: "onClone => { }",
}])

const insertSnippet = () => {
    codeEditor.value.insertSnippet(() => {
        return {
            snippet: onStartSnippet
        }
    });
}

const onCodeChange = (e: string) => {
    codeArray.value[codeIndex.value].code = e;
}
const format = () => {
    codeEditor.value.format();
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