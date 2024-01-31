<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-01 11:20:34
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
    <div id="code-editor" ref="code_editor"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, withDefaults } from 'vue';
import { monaco } from "./CodeEditor"
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { CodeEditorProps, CodeEditorEmits, editorOptions } from './CodeEditor';

// ----------props & emit------------------------------------
const prop = withDefaults(defineProps<CodeEditorProps>(), {
    modelValue: '',
    height: "100%",
    width: "100%"
});
const emit = defineEmits<CodeEditorEmits>()


// ----------data related -----------------------------------
// register editor worker
self.MonacoEnvironment = {
    getWorker(_: string, label: string) {
        return new EditorWorker()
    },
}
// code_editor's dom
const code_editor = ref<HTMLElement | null>(null);
//  editor instance
let editor: monaco.editor.IStandaloneCodeEditor;

// ----------hooks-----------------------------------------
// init editor and register change event
onMounted(() => {
    editor = monaco.editor.create(code_editor.value as HTMLElement, {
        value: prop.modelValue, // set the initial value of the editor
        ...editorOptions,
        ...prop.editorOptions
    })
    editor.onDidChangeModelContent(onEditorValueChange)
})
// destroy editor
onBeforeUnmount(() => {
    editor.dispose()
})

watch(() => prop.modelValue, (val) => {
    if (editor) {
        const editorValue = editor.getValue()
        if (val !== editorValue) {
            editor.setValue(val)
        }
    }
})

// ----------methods-----------------------------------------

/**
 * @description: editor's value change event, emit change event
 * @param {*} monaco.editor.IModelContentChangedEvent
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-31 13:45:55
 */
const onEditorValueChange = (e: monaco.editor.IModelContentChangedEvent) => {
    emit("change", editor.getValue())
    emit("update:modelValue", editor.getValue());
}

/**
 * @description: After the user has obtained the component, user can insert the code snippet through the exported function
 * @param {*} fn () => { position: monaco.Position;snippet: monaco.languages.CompletionItem})
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-31 13:46:49
 */
const insertSnippet = (fn: () => {
    position?: monaco.Position
    snippet: monaco.languages.CompletionItem
}) => {
    const { snippet, position } = fn();
    if (position) {
        editor.setPosition(position);
    }
    let contribution = editor.getContribution("snippetController2") as monaco.editor.IEditorContribution;
    contribution.insert(snippet.insertText);
    editor.focus()
}
defineExpose({
    insertSnippet,
})


</script>

<style>
.decorationsOverviewRuler {
  border-radius: 25px;
  width: 8px !important;
}
</style>
<style scoped>
#code-editor {
    height: v-bind("prop.height");
    width: v-bind("prop.width");
}
</style>
