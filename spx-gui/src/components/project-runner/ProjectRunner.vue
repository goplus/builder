<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-03-06 14:08:44
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 16:49:50
 * @FilePath: \spx-gui\src\components\project-runner\ProjectRunner.vue
 * @Description: 
-->
<template>
  <IframeDisplay v-if="zipData" :zip-data="zipData" @console="handleConsole" />
</template>

<script lang="ts" setup>
import { Project } from '@/models/project'
import { ref } from 'vue'
import IframeDisplay from './IframeDisplay.vue'

const props = defineProps<{ project: Project }>()

const zipData = ref<ArrayBuffer | null>(null)

const emit = defineEmits(['console'])

const handleConsole = (type: 'log' | 'warn', args: any[]) => {
  emit('console', type, args)
}

defineExpose({
  run: async () => {
    const zipFile = await props.project.exportZipFile()
    zipData.value = await zipFile.arrayBuffer()
  },
  stop: () => {
    zipData.value = null
  }
})
</script>
