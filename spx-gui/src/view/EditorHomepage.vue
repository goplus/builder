<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:30:39
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 17:56:41
 * @FilePath: /builder/spx-gui/src/view/EditorHomepage.vue
 * @Description:
-->
<template>
  <n-layout has-sider>
    <n-layout style="width: 60%; height: 100%" collapsible>
      <!-- S Component SpxEditor -->
      <SpxEditor />
      <!-- E Component SpxEditor -->
    </n-layout>
    <n-layout style="width: 40%">
      <n-layout-content>
        <!-- S Component SpxStage -->
        <SpxStage :project="project" />
        <!-- E Component SpxStage -->
        <!-- S Component assetLibrary -->
        <SpriteList />
        <!-- E Component assetLibrary -->
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import SpxEditor from '@/components/spx-editor/SpxEditor.vue'
import SpxStage from '@/components/spx-stage/SpxStage.vue'
import SpriteList from '@/components/sprite-list/SpriteList.vue'
import { NLayout, NLayoutContent } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/store/modules/project'
const projectStore = useProjectStore()
const { project } = storeToRefs(projectStore)
</script>

<style scoped></style>
