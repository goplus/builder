<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-26 22:15:41
 * @FilePath: /builder/spx-gui/src/components/spx-stage/SpxStage.vue
 * @Description: 
-->
<template>
  <div class="spx-stage">
    <div class="stage-button">Stage</div>
    <n-button type="success" class="stage-run-button" @click="run">Run</n-button>
    <iframe src="/main.html" frameborder="0" v-if="show" class="show"></iframe>
    <div v-else class="show center">waiting for load...</div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref } from "vue";
import type { projectType } from "@/types/file";
import { NButton } from "naive-ui";
import { useProjectStore } from "@/store/modules/project";
defineProps({
  project: {
    type: Object as () => projectType,
  },
});
let show = ref(false);
// useProjectStore().watchProjectChange(() => {
//   show.value = false
//   // wait 300ms render because of async load
//   setTimeout(() => {
//     show.value = true
//   }, 300)
// })
const run = async () => {
  show.value = false;
  await useProjectStore().saveByProject();
  // wait 100ms render because of async load

  setTimeout(() => {
    show.value = true;
  }, 100);
};
</script>

<style scoped lang="scss">
.spx-stage {
  height: 40vh;
  display: flex;
  flex-direction: column;
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  margin: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  .stage-button {
    background: rgba(90, 196, 236, 0.4);
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 2;
  }
  .n-button{
    background:#3A8B3B;
    width: 50px;
    position: absolute;
    right: 6px;
    top:2px;
    border: 2px solid #00142970;
    border-radius:16px;
  }
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
