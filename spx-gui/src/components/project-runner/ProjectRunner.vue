<template>
  <div class="project-runner">
    <IframeDisplay v-if="zipData" :zip-data="zipData" />
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@/class/project'
import { ref } from 'vue'
import IframeDisplay from './IframeDisplay.vue'

const { project } = defineProps<{ project: Project }>()

const zipData = ref<ArrayBuffer | Uint8Array | null>(null)

defineExpose({
  run: async () => {
    const zipResp = project.zip
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
