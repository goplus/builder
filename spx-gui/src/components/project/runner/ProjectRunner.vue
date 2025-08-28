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
  async run(signal?: AbortSignal) {
    return projectRunnerRef.value?.run(signal)
  },
  async stop() {
    return projectRunnerRef.value?.stop()
  },
  async rerun() {
    return projectRunnerRef.value?.rerun()
  },
  async getScreenShot(): Promise<File | null> {
    // 调用 ProjectRunnerV2 的截图方法
    if (projectRunnerRef.value && typeof projectRunnerRef.value.getScreenShot === 'function') {
      return await projectRunnerRef.value.getScreenShot()
    }
    return null
  }
})
</script>

<template>
  <ProjectRunnerV2 ref="projectRunnerRef" v-bind="props" @console="handleConsole" @exit="handleExit" />
</template>
