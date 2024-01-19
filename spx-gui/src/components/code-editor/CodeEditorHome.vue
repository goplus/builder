
<template>
    <!-- TODO: abstract component to page -->
    <n-layout has-sider style="height: 700px;">
        <n-layout-content>
            <CodeEditor></CodeEditor>
        </n-layout-content>
    </n-layout>
</template>
<script setup>
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
import CodeEditor from "./CodeEditor.vue"
</script>