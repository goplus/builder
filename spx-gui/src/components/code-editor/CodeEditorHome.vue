<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 17:54:18
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 17:59:09
 * @FilePath: /builder/spx-gui/src/components/code-editor/CodeEditorHome.vue
 * @Description: 
-->

<template>
    <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px);">
        <n-layout-sider :native-scrollbar="false" style="width: 300px">
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