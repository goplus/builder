<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:30:39
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-01-12 17:30:39
 * @FilePath: src/view/EditorHomepage.vue
 * @Description:
-->
<template>
  <n-layout has-sider style="height: 100vh;">
    <n-layout style="width: 60%;" collapsible>
      <!-- S Component SpxEditor -->
      <SpxEditor></SpxEditor>
      <!-- E Component SpxEditor -->
    </n-layout>
    <n-layout style="width: 40%;">
      <n-layout-content>
        [TODO] Spx Compile Result
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup>
import SpxEditor from "@/components/spx-editor/SpxEditor.vue";
import { NLayout, NLayoutContent } from "naive-ui";

</script>

<style scoped>

</style>
