<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 16:27:28
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
    <div>
        <div>
            <n-button v-for="snippet in store.toolbox" @click="insertCode(toRaw(snippet))">{{ snippet.label }}</n-button>
        </div>
        <button v-for="item in store.spx_list" :key="item.id" @click="toggleCodeById(item.id)">{{ item.id }}</button>
        <button @click="submit">submit</button>
        <button @click="format">format</button>
        <div id="code-editor" ref="code_editor"></div>
    </div>
</template>
  
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, toRaw } from 'vue';
import { monaco, options } from "@/plugins/code-editor/index"
import { useEditorStore } from "@/store"
import { NButton } from 'naive-ui';

const store = useEditorStore();
const code_editor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;
let commandInsert = ref("")
let code = ref<string>('');




onMounted(() => {
    console.log(store.spx_list)
    editor = monaco.editor.create(code_editor.value as HTMLElement, {
        value: store.getCurrentSpxCode(), // set the initial value of the editor
        ...options
    })
    editor.onDidChangeModelContent((e: monaco.editor.IModelContentChangedEvent) => {
        store.setCurrentSpxCode(code.value = editor.getValue() || '')
    })
    // when alt + z, toggle word wrap
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
        editor.updateOptions({
            wordWrap: editor.getRawOptions().wordWrap === 'on' ? 'off' : 'on'
        })
    })
    commandInsert.value = editor.addCommand(
        0,
        function () {
            editor.trigger(null, "insertSnippet", {
                snippet: "onAnyKey ${1:key} => {\n\t${2:condition}\t\n}"
            });
        },
        ""
    );

})
onBeforeUnmount(() => {
    editor.dispose()
})
watch(() => store.current, () => {
    editor.setValue(store.getCurrentSpxCode())
})
const format = () => {
    const model = editor.getModel() as monaco.editor.ITextModel;
    const forRes = formatSPX(editor.getValue());
    if (forRes.Body) {
        editor.setValue(forRes.Body)
    } else {
        monaco.editor.setModelMarkers(model, "owner", [{
            message: forRes.Error.Msg,
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: forRes.Error.Line,
            startColumn: forRes.Error.Column,
            endLineNumber: forRes.Error.Column,
            endColumn: forRes.Error.Line
        }]);
    }
}
const submit = () => {
    console.log(editor.getValue())
}

const insertCode = (snippet: monaco.languages.CompletionItem) => {
    console.log(snippet)
    store.insertSnippet(snippet)
}
// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
    let contribution = editor.getContribution("snippetController2") as monaco.editor.IEditorContribution;
    contribution.insert(snippet.insertText);
    editor.focus()
}
// register insertSnippet
store.$onAction(({
    name,
    store,
    args, 
    after, 
    onError,
}) => {

    after(() => {
        if (name === "insertSnippet") {
            const snippet = args[0] as monaco.languages.CompletionItem
            triggerInsertSnippet(snippet)
        }
    })
})
const toggleCodeById = (id: string) => {
    store.setCurrent(id);
}
</script>
  
<style scoped>
#code-editor {
    height: 100%;
    width: 600px;
}
</style>