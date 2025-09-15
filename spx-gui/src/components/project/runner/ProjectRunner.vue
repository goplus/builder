<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '@/models/project'
import ProjectRunnerV2 from './v2/ProjectRunnerV2.vue'

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  exit: [code: number]
}>()

const projectRunnerRef = ref<InstanceType<typeof ProjectRunnerV2>>()

function handleConsole(type: 'log' | 'warn', args: unknown[]) {
  emit('console', type, args)
}

function handleExit(code: number) {
  emit('exit', code)
}

defineExpose({
  async run() {
    return projectRunnerRef.value?.run()
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
  <ProjectRunnerV2 ref="projectRunnerRef" v-bind="props" @console="handleConsole" @exit="handleExit" />
</template>
