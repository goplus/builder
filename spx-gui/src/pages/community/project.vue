<template>
  <ProjectRunner
    v-if="project != null"
    ref="projectRunnerRef"
    class="project-runner"
    :project="project"
  />
  <UILoading :visible="project == null" cover />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { Project } from '@/models/project'
import { UILoading } from '@/components/ui'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'

const props = defineProps<{
  owner: string
  name: string
}>()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()

const project = useAsyncComputed(async () => {
  const p = new Project()
  await p.loadFromCloud(props.owner, props.name)
  return p
})

watchEffect(() => {
  projectRunnerRef.value?.run()
})
</script>

<style scoped lang="scss">
.project-runner {
  padding: 20px;
  flex: 1 1 0;
}
</style>
