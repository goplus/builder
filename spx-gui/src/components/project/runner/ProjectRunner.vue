<script setup lang="ts">
import { ref } from 'vue'
import { useSpxVersion } from '@/utils/utils'
import type { Project } from '@/models/project'
import ProjectRunnerV1 from './v1/ProjectRunnerV1.vue'
import ProjectRunnerV2 from './v2/ProjectRunnerV2.vue'

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunnerV1> | InstanceType<typeof ProjectRunnerV2>>()

function handleConsole(type: 'log' | 'warn', args: unknown[]) {
  emit('console', type, args)
}

const version = useSpxVersion()

defineExpose({
  async run(signal?: AbortSignal) {
    return projectRunnerRef.value?.run(signal)
  },
  async stop() {
    return projectRunnerRef.value?.stop()
  },
  async rerun() {
    return projectRunnerRef.value?.rerun()
  }
})
</script>

<template>
  <ProjectRunnerV2 v-if="version === 'v2'" ref="projectRunnerRef" v-bind="props" @console="handleConsole" />
  <ProjectRunnerV1 v-else v-bind="props" ref="projectRunnerRef" @console="handleConsole" />
</template>
