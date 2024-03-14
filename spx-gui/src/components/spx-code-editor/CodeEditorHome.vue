<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 17:54:18
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 20:56:03
 * @FilePath: /spx-gui/src/components/spx-code-editor/CodeEditorHome.vue
 * @Description: 
-->

<template>
  <n-layout has-sider :style="layoutStyle">
    <n-layout-sider
      :native-scrollbar="false"
      collapse-mode="width"
      :collapsed-width="78"
      :width="260"
      show-trigger="arrow-circle"
      style="border-right: 2px dashed #8f98a1"
    >
      <ToolBox />
    </n-layout-sider>
    <n-layout-content>
      <SpxCodeEditor />
    </n-layout-content>
  </n-layout>
</template>
<script lang="ts" setup>
import { NLayout, NLayoutSider, NLayoutContent } from 'naive-ui'
import SpxCodeEditor from './SpxCodeEditor.vue'
import ToolBox from './ToolBox.vue'

const layoutStyle = {
  height: 'calc(100vh - 140px)',
  display: 'flex',
  flexDirection: 'column',
  border: '2px solid #00142970',
  position: 'relative',
  background: 'white',
  borderRadius: '0 24px 24px 0',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden'
}
</script>
