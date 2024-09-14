<template>
  <div class="iframe-container">
    <IframeDisplay
      v-if="zipData"
      :zip-data="zipData"
      @console="handleConsole"
      @loaded="loading = false"
    />
    <UILoading :visible="loading" cover />
  </div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { registerPlayer } from '@/utils/player-registry'
import { Project } from '@/models/project'
import IframeDisplay from './IframeDisplay.vue'
import { UILoading } from '@/components/ui'

const props = defineProps<{ project: Project }>()

const zipData = ref<ArrayBuffer | null>(null)
const loading = ref(true)

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const handleConsole = (type: 'log' | 'warn', args: unknown[]) => {
  emit('console', type, args)
}

const registered = registerPlayer(() => {
  // For now we don't need to implement stop handler here because there's no chance for
  // the user to activate another audio player when `ProjectRunner` visible.
  // If you see this warning in console, you need to think what the proper behavior is.
  console.warn('unexpected call')
})

onUnmounted(() => {
  registered.onStopped()
})

defineExpose({
  run: async () => {
    loading.value = true
    registered.onStart()
    const gbpFile = await props.project.exportGbpFile()
    zipData.value = await gbpFile.arrayBuffer()
  },
  stop: () => {
    zipData.value = null
    registered.onStopped()
  }
})
</script>
<style scoped lang="scss">
.iframe-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
