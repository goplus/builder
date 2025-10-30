<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '@/models/project'
import ProjectRunnerWeb from './ProjectRunnerWeb.vue'
import ProjectRunnerDesktop from './ProjectRunnerDesktop.vue'

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  exit: [code: number]
}>()

const isDesktop = window.spxGuiDesktop != null
const projectRunnerRef = ref<InstanceType<typeof ProjectRunnerWeb | typeof ProjectRunnerDesktop>>()

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
  <ProjectRunnerDesktop
    v-if="isDesktop"
    ref="projectRunnerRef"
    v-bind="props"
    @console="handleConsole"
    @exit="handleExit"
  />
  <ProjectRunnerWeb v-else ref="projectRunnerRef" v-bind="props" @console="handleConsole" @exit="handleExit" />
</template>
