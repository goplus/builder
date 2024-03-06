<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-03-06 14:08:44
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 16:49:50
 * @FilePath: \spx-gui\src\components\project-runner\ProjectRunner.vue
 * @Description: 
-->
<template>
  <div class="project-runner">
    <IframeDisplay v-if="zipData" :zip-data="zipData" />
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@/class/project'
import { ref } from 'vue'
import IframeDisplay from './IframeDisplay.vue'

const props = defineProps<{ project: Project }>()

const zipData = ref<ArrayBuffer | Uint8Array | null>(null)

defineExpose({
  run: async () => {
    const zipResp = props.project.zip
    const buf = await (await zipResp).arrayBuffer()
    zipData.value = buf
  },
  stop: () => {
    zipData.value = null
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
