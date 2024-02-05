<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-19 17:54:18
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-02 14:24:10
 * @FilePath: /spx-gui/src/components/spx-code-editor/CodeEditorHome.vue
 * @Description: 
-->

<template>
    <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px);">
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
            <SpxCodeEditor />
        </n-layout-content>
    </n-layout>
</template>
<script lang="ts" setup>
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
import SpxCodeEditor from "./SpxCodeEditor.vue"
import ToolBox from "./ToolBox.vue"

</script>