<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-19 23:34:37
 * @FilePath: /spx-gui/src/components/spx-code-editor/SpxCodeEditor.vue
 * @Description: 
-->
<template>
    <div class="code-editor-space">
        <div class="code-button">{{ $t('component.code') }}</div>
        <n-button-group class="formatBtnGroup" size="small">
            <n-button class="" @click="clear">{{ $t("editor.clear") }}</n-button>
            <n-button class="formatBtn" @click="format">{{ $t("editor.format") }}</n-button>
        </n-button-group>
        <CodeEditor ref="code_editor" :modelValue="currentCode" @update:modelValue="onCodeChange" />
    </div>
</template>
  
<script setup lang="ts">
import CodeEditor, { monaco } from "@/components/code-editor"
import { ref,  computed } from 'vue';
import { useEditorStore } from "@/store"
import { useSpriteStore } from '@/store/modules/sprite';
import { Sprite } from "@/class/sprite";
import { NButton } from "naive-ui";

const spriteStore = useSpriteStore()
const { setCurrentByName } = spriteStore;
const store = useEditorStore();
const code_editor = ref();
const undef = "Undefined*";


// watch the current sprite and set it's code to editor
const currentCode = computed(() => {
    return spriteStore.current?.code || ''
})

// Listen for editor value change, sync to sprite store
const onCodeChange = async (value: string) => {
    console.log(spriteStore.current)
    if (spriteStore.current) {
        spriteStore.current.code = value
    }else {
        const tmpFile = await getImageAsFile("/img/logo.png", "logo.png") as File
        const sprite = new Sprite(undef, [tmpFile], value);
        spriteStore.addItem(sprite);
        setCurrentByName(sprite.name)
        console.log(spriteStore.current)
    }
}

async function fetchImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Get File Error');
  }
  return response.blob();
}

function blobToFile(blob: Blob, name: string) {
  return new File([blob], name);
}

const getImageAsFile = async (imagePath: string, fileName: string) => {
  try {
    const blob = await fetchImage(imagePath);
    return new Promise<File>((resolve) => {
      resolve(blobToFile(blob, fileName));
    });
  } catch (error) {
    console.error("Error fetching image:", error);
  }
}

const clear = () => {
    code_editor.value.clear()
}

const format = () => {
    code_editor.value.format()
}

// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
    code_editor.value.insertSnippet(
        snippet
    )
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


</script>

<style scoped>
#code-editor {
    height: 100%;
}


.code-button {
    background: #cdf5ef;
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 2;
}

.code-editor-space {
    display: flex;
    flex-direction: column;
    height: calc(100% - 44px);
    position: relative;
    background: white;
    padding: 4px;
}

.formatBtnGroup {
    z-index: 99;
    right: 20px;
    position: absolute;

    .n-button {
        background: #00000000;
        color: #001429;
        border: 1px solid black;
    }

    .n-button:hover {
        background: #ed729e20;
    }
}

.action,
.sprite {
    display: flex;
    justify-content: end;
    margin-top: 10px;
}
</style>