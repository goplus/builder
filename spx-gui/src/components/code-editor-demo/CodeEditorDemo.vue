<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-26 19:07:52
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-31 15:21:30
 * @FilePath: /builder/spx-gui/src/components/code-editor-demo/CodeEditorDemo.vue
 * @Description: 
-->
<template>
    <div class="demo">
        <div v-for="(item, index) in codeArray" @click="codeIndex = index"> {{ index }} </div>
        {{ editorContent }}
        <button @click="insert">insert</button>

            <CodeEditor width="500px" height="500px" ref="codeEditor"
                :editor-options="{ minimap: { enabled: false }, readOnly: false }" :model-value="editorContent"
                @update:model-value="onCodeChange" />
    </div>
</template>
<script setup lang="ts">
import CodeEditor, { monaco } from "../code-editor/CodeEditor"
import { ref, computed } from "vue"
let codeEditor = ref();
const editorContent = computed(() => {
    return codeArray.value[codeIndex.value].code;
})

const codeIndex = ref(0);
const codeArray = ref([{
    code: "dsadas",
}, {
    code: "zzyzzy",
}])
const onCodeChange = (e: string) => {
    codeArray.value[codeIndex.value].code = e;
}
const insert = () => {
    codeEditor.value.insertSnippet((editor: monaco.editor.IStandaloneCodeEditor) => {
        return {
            position: new monaco.Position(1, 1),
            snippet: {
                label: "onStart",
                insertText: "onStart => {\n\t${1:condition}\t\n}",
                insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Function,
                range: new monaco.Range(1, 1, 1, 1),
                detail: "This is onStart Function",
            }
        }
    })
}


</script>
<style lang="scss">
.demo {
    height: 700px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>