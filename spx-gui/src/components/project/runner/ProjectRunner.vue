<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '@/models/project'
import ProjectRunnerV2 from './v2/ProjectRunnerV2.vue'
import type { KeyboardEventType, KeyCode } from '@/components/project/sharing/MobileKeyboard/mobile-keyboard'
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
  async pauseGame() {
    return projectRunnerRef.value?.pauseGame()
  },
  async resumeGame() {
    return projectRunnerRef.value?.resumeGame()
  },
  async startRecording() {
    return projectRunnerRef.value?.startRecording()
  },
  async stopRecording() {
    return projectRunnerRef.value?.stopRecording()
  },
  async dispatchKeyboardEvent(type: KeyboardEventType, key: KeyCode) {
    return projectRunnerRef.value?.dispatchKeyboardEvent(type, key)
  },
  async takeScreenshot() {
    return projectRunnerRef.value?.takeScreenshot()
  }
})
</script>

<template>
  <ProjectRunnerV2 ref="projectRunnerRef" v-bind="props" @console="handleConsole" @exit="handleExit" />
</template>
