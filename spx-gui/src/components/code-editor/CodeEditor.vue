<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-22 17:10:33
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
    <div class="code-editor">
        <div class="sprite">
            <span>spx</span>
            <n-scrollbar x-scrollable>
                <n-button v-for="item in spriteStore.list" :key="item.name" @click="toggleCodeById(item.name)">{{
                    item.name }}</n-button>
            </n-scrollbar>

        </div>
        <div class="action">
            <span>action</span>
            <n-button @click="submit">submit</n-button>
            <n-button @click="format">format</n-button>
        </div>
        <div id="code-editor" ref="code_editor"></div>
    </div>
</template>
  
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { monaco, options } from "@/plugins/code-editor/index"
import { useEditorStore } from "@/store"
import { useSpriteStore } from '@/store/modules/sprite';
import { storeToRefs } from 'pinia'
import { NButton } from 'naive-ui';

const { setCurrentByName } = useSpriteStore()
const spriteStore = useSpriteStore()
const store = useEditorStore();
const code_editor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

onMounted(() => {
    editor = monaco.editor.create(code_editor.value as HTMLElement, {
        value: "", // set the initial value of the editor
        ...options
    })
    editor.onDidChangeModelContent(onEditorValueChange)
})
onBeforeUnmount(() => {
    editor.dispose()
})
// watch the current sprite and set it's code to editor
watch(() => spriteStore.current, (newVal, oldVal) => {
    console.log(newVal?.name, oldVal?.name)
    if (newVal?.name !== oldVal?.name) {
        newVal.code && editor.setValue(newVal.code)
    }
}, {
    deep: true
})
// format function power by gopfmt
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
// TODO:submit function
const submit = () => {
    console.log(editor.getValue())
}


// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
    let contribution = editor.getContribution("snippetController2") as monaco.editor.IEditorContribution;
    contribution.insert(snippet.insertText);
    editor.focus()
}
// Listen for editor value change, sync to sprite store
const onEditorValueChange = (e: monaco.editor.IModelContentChangedEvent) => {
    // store.setCurrentSpxCode(editor.getValue() || '')
    if (spriteStore.current) {
        spriteStore.current.code = editor.getValue() || ''
    }
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
const toggleCodeById = (name: string) => {
    setCurrentByName(name)
}

</script>
  
<style scoped>
#code-editor {
    height: 100%;
}


.code-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.action,
.sprite {
    display: flex;
    justify-content: end;
    margin-top: 10px;
}
</style>