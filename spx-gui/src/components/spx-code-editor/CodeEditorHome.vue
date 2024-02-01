<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 17:54:18
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-30 16:27:59
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditorHome.vue
 * @Description: 
-->

<template>
    <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px);">
        <n-layout-sider :native-scrollbar="false" style="width: 300px">
            <ToolBox />
        </n-layout-sider>
        <n-layout-content>
            <SpxCodeEditor />
        </n-layout-content>
    </n-layout>
</template>
<script lang="ts" setup>
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
import SpxCodeEditor from "./SpxCodeEditor.vue"
import ToolBox from "./ToolBox.vue"
</script>