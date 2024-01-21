<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-16 11:46:28
 * @FilePath: /spx-gui-front-private/src/components/spx-stage/SpxStage.vue
 * @Description: 
-->
<template>
  <div class="spx-stage">
    <h1>stage</h1>
    <iframe src="/main.html" frameborder="0" v-if="show" class="show"></iframe>
    <div v-else class="show">loading...</div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref } from 'vue';
import type { projectType } from '@/types/file';
import { useProjectStore } from "@/store/modules/project";
defineProps({
  project: {
    type: Object as () => projectType,
  }
})
let show = ref(false)
useProjectStore().watchProjectChange(() => {
  show.value = false
  // wait 100ms render because of async load
  setTimeout(() => {
    show.value = true
  }, 100)
})
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
}
</style>
