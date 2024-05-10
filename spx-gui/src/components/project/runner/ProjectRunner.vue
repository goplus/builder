<template>
  <IframeDisplay v-if="zipData" :zip-data="zipData" @console="handleConsole" />
</template>

<script lang="ts" setup>
import { Project } from '@/models/project'
import { ref } from 'vue'
import IframeDisplay from './IframeDisplay.vue'

const props = defineProps<{ project: Project }>()

const zipData = ref<ArrayBuffer | null>(null)

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const handleConsole = (type: 'log' | 'warn', args: unknown[]) => {
  emit('console', type, args)
}

defineExpose({
  run: async () => {
    const gbpFile = await props.project.exportGbpFile()
    zipData.value = await gbpFile.arrayBuffer()
  },
  stop: () => {
    zipData.value = null
  }
})
</script>
