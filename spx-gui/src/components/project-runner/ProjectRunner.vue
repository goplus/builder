<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-03-01 17:38:55
 * @Description: 
-->
<template>
  <div class="project-runner">
    <IframeDisplay v-if="running && zipData" :zip-data="zipData" />
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@/class/project'
import { ref, watchEffect } from 'vue'
import IframeDisplay from './IframeDisplay.vue'

const { project } = defineProps<{ project: Project }>()

const running = ref(false)

const zipData = ref<ArrayBuffer | Uint8Array | null>(null)

watchEffect(async () => {
  const zipResp = project.zip
  const buf = await (await zipResp).arrayBuffer()
  zipData.value = buf
})

defineExpose({
  run: () => {
    running.value = true
  },
  stop: () => {
    running.value = false
  }
})
</script>

<style lang="scss" scoped>
.project-runner {
  flex: 1;
  text-align: center;
}

.runner {
  width: 100%;
  height: 100%;
}
</style>
