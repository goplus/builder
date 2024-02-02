<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 17:54:18
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-26 18:04:03
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditorHome.vue
 * @Description: 
-->

<template>
    <n-layout has-sider  style="height: calc(100vh - 60px - 54px - 12px);">
        <n-layout-sider :native-scrollbar="false"
        collapse-mode="width"
        :collapsed-width="78"
        :width="260"
        show-trigger="arrow-circle"
        style="background:rgba(255, 255, 255, 0)"
        >
            <ToolBox />
        </n-layout-sider>
        <n-layout-content>
            <CodeEditor />
        </n-layout-content>
    </n-layout>
</template>
<script lang="ts" setup>
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
import CodeEditor from "./CodeEditor.vue"
import ToolBox from "./ToolBox.vue"
</script>