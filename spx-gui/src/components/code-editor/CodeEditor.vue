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
            <n-button @click="addFile">add</n-button>
            <n-button v-show="isNew" @click="save">save</n-button>
        </div>
        <div id="code-editor" ref="code_editor"></div>
        <n-modal v-model:show="showModal" :mask-closable="false" preset="dialog" title="Warning" size="huge"
            content="do you want to save?" positive-text="Save" negative-text="Cancel" @positive-click="onPositiveClick"
            @negative-click="onNegativeClick">
            <n-input v-model:value="fileName" type="text" placeholder="please input file name" />
            <n-upload action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f" @before-upload="beforeUpload">
                <n-button color="#fff" :text-color="commonColor"> Upload </n-button>
            </n-upload>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { monaco, options } from "@/plugins/code-editor/index"
import { useEditorStore } from "@/store"
import { useSpriteStore } from '@/store/modules/sprite';
import { storeToRefs } from 'pinia'
import FileWithUrl from "@/class/FileWithUrl"
import Sprite from "@/class/sprite";
import { commonColor } from "@/assets/theme.ts";

import {
    NButton,
    NModal,
    useMessage,
    NInput,
    NUpload,
    UploadFileInfo,
} from "naive-ui";

const { setCurrentByName } = useSpriteStore()
const spriteStore = useSpriteStore()
const store = useEditorStore();
const code_editor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;
const editorState = ref({
    loaded: false,
    hasValue: false,
    value:""
})
const showModal = ref(false);
const message = useMessage();

onMounted(() => {
    editor = monaco.editor.create(code_editor.value as HTMLElement, {
        value: "", // set the initial value of the editor
        ...options,
    })
    editor.onDidChangeModelContent(onEditorValueChange)
    editorState.value.loaded = true;
})

onBeforeUnmount(() => {
    editor.dispose()
})
// watch the current sprite and set it's code to editor
watch(() => spriteStore.current, (newVal, oldVal) => {
    console.log(newVal?.name, oldVal?.name)
    if (newVal?.name !== oldVal?.name) {
        newVal?.code && editor.setValue(newVal.code)
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

// show the save button 
const isNew = computed(() => {
    return spriteStore.current == null && editorState.value.loaded && editorState.value.hasValue
})
const save = () => {
    if (isNew.value) {
        showModal.value = true;
    }
};

// add file when editor change and current sprite is null
const addFile = () => {
    // If there are currently any modifications that have not been saved
    if (spriteStore.current == null && editor.getValue() !== "") {
        showModal.value = true;
        return;
    }
    initEditor();
};

// init editor when current sprite is null
const initEditor = () => {
    spriteStore.current = null;
    editor.setValue("");
};

const fileName = ref("");
const beforeUpload = (data: {
    file: UploadFileInfo;
    fileList: UploadFileInfo[];
}) => {
    let uploadFile = data.file;
    if (uploadFile.file) {
        const fileURL = URL.createObjectURL(uploadFile.file);
        const fileWithUrl = new FileWithUrl(uploadFile.file, fileURL);

        let fileArray: FileWithUrl[] = [fileWithUrl];
        const sprite = new Sprite(fileName.value, fileArray, editor.getValue());
        spriteStore.addItem(sprite);
    } else {
        message.error("Invalid or non-existent uploaded files");
        return false;
    }
    return true;
};

// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
    let contribution = editor.getContribution("snippetController2") as monaco.editor.IEditorContribution;
    contribution.insert(snippet.insertText);
    editor.focus()
}
// Listen for editor value change, sync to sprite store
const onEditorValueChange = (e: monaco.editor.IModelContentChangedEvent) => {
    // editorState.value.value = editor.getValue()
    editorState.value.hasValue = editor.getValue() !== ""
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

const negativeSpriteName = ref("");
const toggleCodeById = (name: string) => {
    negativeSpriteName.value = name;
    if (spriteStore.current == null && editor.getValue() !== "") {
        showModal.value = true;
        return;
    }
    setCurrentByName(negativeSpriteName.value);
};

function onNegativeClick() {
    showModal.value = false;
    setCurrentByName(negativeSpriteName.value);
    message.success("Cancel");
}
function onPositiveClick() {
    showModal.value = false;
    setCurrentByName(negativeSpriteName.value);
    message.success("Save success");
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
