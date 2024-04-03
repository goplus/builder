<template>
  <div class="container">
    <div class="header">
      <n-button type="primary" @click="handleRerun">Rerun</n-button>
      <n-button>Share</n-button>
    </div>
    <ProjectRunner ref="projectRunnerRef" :project="projectStore.project" class="runner" />
  </div>
</template>
<script setup lang="ts">
import { useProjectStore } from '@/stores'
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import ProjectRunner from '../project-runner/ProjectRunner.vue'
import { ref } from 'vue'
import { NButton } from 'naive-ui'

const route = useRoute()
const projectStore = useProjectStore()
const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

watch(
  () => {
    const owner = route.params.owner as string
    const name = route.params.name as string
    return { owner, name }
  },
  async ({ owner, name }) => {
    console.log('open project', owner, name)
    if (!owner || !name) return
    await projectStore.openProject(owner, name)
    projectRunnerRef.value?.run()
  },
  { deep: true, immediate: true }
)

const handleRerun = () => {
  projectRunnerRef.value?.stop()
  projectRunnerRef.value?.run()
}
</script>
<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
}
.header {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}
.runner {
  flex: 1;
}
</style>
