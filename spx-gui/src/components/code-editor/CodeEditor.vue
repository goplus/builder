<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-15 15:30:26
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-01 11:20:34
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditor.vue
 * @Description: 
-->
<template>
  <div class="code-editor-space">
    <div class="code-button">Code</div>
    <!-- TODO: Delete  -->
    <!-- <div class="sprite">
      <n-scrollbar x-scrollable>
        <n-button
          v-for="item in spriteStore.list"
          :key="item.name"
          @click="toggleCodeById(item.name)"
          >{{ item.name }}</n-button
        >
      </n-scrollbar>
    </div> -->

    <n-button-group class="formatBtnGroup" size="small">
      <n-button class="" @click="format">clear</n-button>
      <n-button class="formatBtn" @click="format">format</n-button>
    </n-button-group>
    <div id="code-editor" ref="code_editor"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { monaco, options } from "@/plugins/code-editor/index";
import { useEditorStore } from "@/store";
import { useSpriteStore } from "@/store/modules/sprite";
import { storeToRefs } from "pinia";
import { NButton, NButtonGroup } from "naive-ui";

const { setCurrentByName } = useSpriteStore();
const spriteStore = useSpriteStore();
const store = useEditorStore();
const code_editor = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor;

onMounted(() => {
  // transparent theme
  monaco.editor.defineTheme("myTransparentTheme", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#FFFFFF", // 透明背景
      "scrollbar.shadow": "#FFFFFF00", // 滚动条阴影颜色
      "scrollbarSlider.background": "#fa81a833", // 滚动条背景颜色
      "scrollbarSlider.hoverBackground": "#fa81a866", // 鼠标悬停时滚动条背景颜色
      "scrollbarSlider.activeBackground": "#fa81a899", // 激活时滚动条背景颜色
      "scrollbarSlider.width": "8px !important", // 激活时滚动条背景颜色
      "minimap.background": "#fa81a810", // 小地图背景颜色
      "minimapSlider.background": "#fa81a833", // 小地图滑块背景颜色
      "minimapSlider.hoverBackground": "#FFFFFF66", // 小地图滑块鼠标悬停背景颜色
      "minimapSlider.activeBackground": "#FFFFFF99", // 小地图滑块激活背景颜色
    },
  });

  editor = monaco.editor.create(code_editor.value as HTMLElement, {
    value: "", // set the initial value of the editor
    ...options,
    theme: "myTransparentTheme",
  });
  editor.onDidChangeModelContent(onEditorValueChange);
});
onBeforeUnmount(() => {
  editor.dispose();
});
// watch the current sprite and set it's code to editor
watch(
  () => spriteStore.current,
  (newVal, oldVal) => {
    console.log(newVal?.name, oldVal?.name);
    if (newVal?.name !== oldVal?.name) {
      newVal?.code && editor.setValue(newVal.code);
    }
  },
  {
    deep: true,
  },
);
// format function power by gopfmt
const format = () => {
  console.log('format')
  const model = editor.getModel() as monaco.editor.ITextModel;
  const forRes = formatSPX(editor.getValue());
  if (forRes.Body) {
    editor.setValue(forRes.Body);
  } else {
    monaco.editor.setModelMarkers(model, "owner", [
      {
        message: forRes.Error.Msg,
        severity: monaco.MarkerSeverity.Warning,
        startLineNumber: forRes.Error.Line,
        startColumn: forRes.Error.Column,
        endLineNumber: forRes.Error.Column,
        endColumn: forRes.Error.Line,
      },
    ]);
  }
};
// TODO:submit function
const submit = () => {
  console.log(editor.getValue());
};

// Listen for insert events triggered by store, registered with store.$onAction
const triggerInsertSnippet = (snippet: monaco.languages.CompletionItem) => {
  let contribution = editor.getContribution(
    "snippetController2",
  ) as monaco.editor.IEditorContribution;
  contribution.insert(snippet.insertText);
  editor.focus();
};
// Listen for editor value change, sync to sprite store
const onEditorValueChange = (e: monaco.editor.IModelContentChangedEvent) => {
  // store.setCurrentSpxCode(editor.getValue() || '')
  if (spriteStore.current) {
    spriteStore.current.code = editor.getValue() || "";
  }
};
// register insertSnippet
store.$onAction(({ name, store, args, after, onError }) => {
  after(() => {
    if (name === "insertSnippet") {
      const snippet = args[0] as monaco.languages.CompletionItem;
      triggerInsertSnippet(snippet);
    }
  });
});
const toggleCodeById = (name: string) => {
  setCurrentByName(name);
};
</script>

<style>
.decorationsOverviewRuler {
  border-radius: 25px;
  width: 8px !important;
}
</style>
<style scoped>
#code-editor {
  height: calc(100% - 24px);
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
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  padding: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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
