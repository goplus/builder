<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-01 11:52:40
 * @FilePath: /builder/spx-gui/src/components/spx-code-editor/SpxCodeEditor.vue
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
            <n-button @click="format">format</n-button>
        </div>
        <CodeEditor ref="code_editor" :modelValue="currentCode" @update:modelValue="onCodeChange" />
    </div>
</template>
  
<script setup lang="ts">
import CodeEditor from "@/components/code-editor/CodeEditor"
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue';
import { monaco, options } from "@/plugins/code-editor/index"
import { useEditorStore } from "@/store"
import { useSpriteStore } from '@/store/modules/sprite';
import { storeToRefs } from 'pinia'
import { NButton } from 'naive-ui';

const { setCurrentByName } = useSpriteStore()
const spriteStore = useSpriteStore()
const store = useEditorStore();
const code_editor = ref();


// watch the current sprite and set it's code to editor
const currentCode = computed(() => {
    return spriteStore.current?.code || ''
})

// Listen for editor value change, sync to sprite store
const onCodeChange = (value: string) => {
    if (spriteStore.current) {
        spriteStore.current.code = value
    }
}


const format = () => {
    code_editor.value.format()
}

// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
    code_editor.value.insertSnippet(() => {
        return {
            snippet
        }
    })
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
