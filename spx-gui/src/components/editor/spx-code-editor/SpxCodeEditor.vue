<template>
  <NLayout has-sider :style="layoutStyle">
    <NLayoutSider
      :native-scrollbar="false"
      collapse-mode="width"
      :collapsed-width="78"
      :width="260"
      show-trigger="arrow-circle"
      style="border-right: 2px dashed #8f98a1"
    >
      <ToolBox :insert-snippet="codeEditor?.insertSnippet" />
    </NLayoutSider>
    <NLayoutContent>
      <div class="code-editor-space">
        <div class="code-button">{{ $t('component.code') }}</div>
        <div class="formatBtnGroup" size="small">
          <NButton class="formatBtn" @click="codeEditor?.format">{{ $t('editor.format') }}</NButton>
        </div>
        <CodeEditor ref="codeEditor" :model-value="value" @update:model-value="onChange" />
      </div>
    </NLayoutContent>
  </NLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NLayout, NLayoutSider, NLayoutContent } from 'naive-ui'
import ToolBox from './ToolBox.vue'
import CodeEditor from './code-editor'

defineProps<{
  value: string
}>()
const emit = defineEmits<{
  change: [value: string]
}>()

const codeEditor = ref<InstanceType<typeof CodeEditor>>()

const onChange = (value: string) => {
  emit('change', value)
}

const layoutStyle = {
  height: 'calc(100vh - 140px)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden'
}
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
