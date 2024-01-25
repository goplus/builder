<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 11:53:52
 * @FilePath: /builder/spx-gui/src/components/spx-stage/SpxStage.vue
 * @Description: 
-->
<template>
  <div class="spx-stage">
    <h1>stage <n-button @click="run">Run</n-button>
    </h1>
    <iframe src="/main.html" frameborder="0" v-if="show" class="show"></iframe>
    <div v-else class="show center">waiting for load...</div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref } from 'vue';
import type { projectType } from '@/types/file';
import { NButton } from "naive-ui";
import { useProjectStore } from "@/store/modules/project";
import { useBackdropStore } from '@/store/modules/backdrop'
defineProps({
  project: {
    type: Object as () => projectType,
  }
})
let show = ref(false)
const backdropStore = useBackdropStore()
const projectStore = useProjectStore()
const run = async () => {
  show.value = false
  // TODO: backdrop.config.zorder depend on sprites, entry code depend on sprites and other code (such as global variables).
  backdropStore.setZOrder()
  projectStore.setCode(projectStore.genEntryCode())
  await projectStore.saveByProject()
  window.project_path = projectStore.project.title
  show.value = true
}
</script>

<style scoped lang="scss">
.spx-stage {
  height: 40vh;
  display: flex;
  flex-direction: column;

  .show {
    flex: 1;
    text-align: center;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
