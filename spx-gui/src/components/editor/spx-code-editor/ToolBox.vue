<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-22 09:12:31
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 20:58:16
 * @FilePath: /spx-gui/src/components/spx-code-editor/ToolBox.vue
 * @Description:Code Editor Toolbox
-->
<template>
  <div class="toolbox">
    <n-tabs
      type="line"
      add-tab-style="color:#a3a3a4"
      animated
      placement="left"
      style="height: 240px"
    >
      <n-tab-pane
        v-for="item in completionToolbox"
        :key="item.label"
        :name="item.label"
        :tab="_t(toolboxTabTranslate[item.label])"
      >
        <n-button
          v-for="(snippet, index) in item.completionItems"
          :key="index"
          style="margin-top: 24px"
          @click="props.insertSnippet?.(toRaw(snippet))"
        >
          {{ snippet.label }}
        </n-button>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
<script setup lang="ts">
import { NButton, NTabs, NTabPane } from 'naive-ui'
import { toRaw, ref } from 'vue'
import type { languages } from 'monaco-editor'
import {
  motionSnippets,
  eventSnippets,
  lookSnippets,
  controlSnippets,
  soundSnippets
} from './code-editor'
import type { LocaleMessage } from '@/utils/i18n'
const props = defineProps<{ insertSnippet?: (snippet: languages.CompletionItem) => void }>()

const toolboxTabTranslate: Record<string, LocaleMessage> = {
  event: { en: 'event', zh: '事件' },
  look: { en: 'look', zh: '外观' },
  sound: { en: 'sound', zh: '声音' },
  motion: { en: 'motion', zh: '运动' },
  control: { en: 'control', zh: '控制' }
}

let completionToolbox = ref([
  {
    label: 'event',
    completionItems: eventSnippets
  },
  {
    label: 'look',
    completionItems: lookSnippets
  },
  {
    label: 'motion',
    completionItems: motionSnippets
  },
  {
    label: 'sound',
    completionItems: soundSnippets
  },
  {
    label: 'control',
    completionItems: controlSnippets
  }
])
</script>
<style scoped lang="scss">
.n-button {
  width: auto;
  border: 1px solid #a4a4a3;
  background: white;
  color: #333333;
  margin-right: 3px;
}

.n-tabs .n-tabs-tab {
  color: #a4a4a3;
}
</style>
