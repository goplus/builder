<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 18:04:56
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
    <div>
        <!-- {{ code }} -->
        <button v-for="item in store.spx_list" :key="item.id" @click="toggleCodeById(item.id)">{{ item.id }}</button>
        <button @click="insertCode('onStart => {\n\t\n}')">onStart</button>
        <button @click="submit">submit</button>
        <button @click="format">format</button>
        <div id="code-editor" ref="code_editor"></div>
    </div>
</template>
  
<script setup lang="ts">
import { monaco, options } from "@/plugins/code-editor/index"
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';
import { useEditorStore } from "@/store"

const code_editor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;
let code = ref<string>('');
// console.log(store.count)
const store = useEditorStore();



watch(() => store.current, () => {
    editor.setValue(store.getCurrentSpxCode())
})

const format = () => {
    console.log()
    const forRes=formatSPX(editor.getValue())
    if(forRes.Body){
        editor.setValue(forRes.Body)
    }
}

onMounted(() => {
    console.log(store.spx_list)
    editor = monaco.editor.create(code_editor.value, {
        value: store.getCurrentSpxCode(), // set the initial value of the editor
        ...options
    })
    editor.onDidChangeModelContent((e) => {
        console.log(editor.getValue() || '')
        store.setCurrentSpxCode(code.value = editor.getValue() || '')
    })

    // when alt + z, toggle word wrap
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
        editor.updateOptions({
            wordWrap: editor.getRawOptions().wordWrap === 'on' ? 'off' : 'on'
        })
    })

})

const toggleCodeById = (id: string) => {
    store.setCurrent(id);
}

const insertCode = (code: string) => {
    const position = editor.getPosition() as monaco.Position
    editor.executeEdits('', [
        {
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: code
        }
    ])
    if (code.includes('\n')) {
        position.lineNumber += Math.floor(code.split('\n').length / 2)
        position.column = 2
    } else {
        position.column += code.length
    }
    editor.setPosition(position)
    editor.focus()
}

const submit = () => {
    console.log(editor.getValue())
}

onBeforeUnmount(() => {
    editor.dispose()
})
</script>
  
<style scoped>
#code-editor {
    height: 100%;
    width: 600px;
}
</style>