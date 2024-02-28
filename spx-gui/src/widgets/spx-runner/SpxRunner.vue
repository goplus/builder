<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-26 17:49:39
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-01 11:44:54
 * @FilePath: \spx-gui\src\widgets\spx-runner\SpxRunner.vue
 * @Description: 
-->
<template>
  <div class="spx-runner-widget">
    <div class="operation">
      <n-button :disabled="!projectid || !ready || !!errorMsg || run" @click="onRun">run</n-button>
      <n-button :disabled="!projectid || !ready || !!errorMsg || !run" @click="onStop"
        >stop</n-button
      >
    </div>
    <div class="project-runner">
      <div v-if="!ready" class="loading">
        <n-spin />
      </div>
      <div v-if="errorMsg" class="error">
        <p>{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, defineProps, watch } from 'vue'
import { NButton, NSpin } from 'naive-ui'
import { Project } from '@/class/project'
// consider use fetch instead of axios
import axios from 'axios'
const props = defineProps<{ projectid?: string }>()
const run = ref(false)
const ready = ref(false)
const errorMsg = ref('')

const baseUrl = import.meta.env.VITE_API_BASE_URL
watch(
  () => props.projectid,
  async (projectid) => {
    if (projectid) {
      ready.value = false
      errorMsg.value = ''
      try {
        const project = new Project()
        await project.load(projectid)
        console.log(project)
        ready.value = true
      } catch (err) {
        console.log(err)
        errorMsg.value = 'loading project fail'
      } finally {
        ready.value = true
      }
    }
  },
  {
    immediate: true
  }
)

const onRun = () => {
  run.value = true
}
const onStop = () => {
  run.value = false
}
</script>
<style lang="scss" scoped>
.spx-runner-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  .operation {
    display: flex;
  }
  .project-runner {
    position: relative;
    width: 100%;
    flex: 1;

    .loading,
    .error {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
// loading icon is not center
:deep(.n-base-loading__container) {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
