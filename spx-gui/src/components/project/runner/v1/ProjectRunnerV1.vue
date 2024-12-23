<template>
  <div class="iframe-container">
    <IframeDisplay v-if="zipData" :zip-data="zipData" @console="handleConsole" @loaded="loading = false" />
    <UIImg v-show="zipData == null || loading" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UILoading :visible="loading" cover />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { registerPlayer } from '@/utils/player-registry'
import { until } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { Project } from '@/models/project'
import { UIImg, UILoading } from '@/components/ui'
import IframeDisplay, { preload } from './IframeDisplay.vue'

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)
const zipData = ref<ArrayBuffer | null>(null)
const loading = ref(false)

const handleConsole = (type: 'log' | 'warn', args: unknown[]) => {
  emit('console', type, args)
}

onMounted(() => {
  preload()
})

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
  async run() {
    loading.value = true
    registered.onStart()
    const gbpFile = await props.project.exportGbpFile()
    zipData.value = await gbpFile.arrayBuffer()
    await until(() => !loading.value)
  },
  stop() {
    zipData.value = null
    registered.onStopped()
  },
  rerun() {
    this.stop()
    return this.run()
  }
})
</script>
<style scoped lang="scss">
.iframe-container {
  position: relative;
  aspect-ratio: 4 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.thumbnail {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
</style>
