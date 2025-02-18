<template>
  <div class="iframe-container">
    <IframeDisplay v-if="zipData" :zip-data="zipData" @console="handleConsole" @loaded="loading = false" />
    <UIImg v-show="zipData == null || loading" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UILoading :visible="loading" cover />
  </div>
</template>

<script lang="ts">
const zipEntryCache = new WeakMap<File, Promise<Blob>>()

function getZipEntry(file: File) {
  if (zipEntryCache.has(file)) return zipEntryCache.get(file)!
  const zipEntry = toNativeFile(file).then((nf) => {
    // For svg files, we convert them to png before sending to spx (v1):
    // 1. Compatibility: Many SVG features are not supported in spx v1
    // 2. Improve performance: SVG rendering is slow in spx v1
    if (nf.type === 'image/svg+xml') return toPng(nf)
    return nf
  })
  zipEntryCache.set(file, zipEntry)
  zipEntry.catch(() => zipEntryCache.delete(file))
  return zipEntry
}
</script>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import JSZip from 'jszip'
import { registerPlayer } from '@/utils/player-registry'
import { until } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { toPng } from '@/utils/img'
import { File, toNativeFile } from '@/models/common/file'
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

async function getProjectData(signal?: AbortSignal) {
  const zip = new JSZip()
  const [{ filesHash }, files] = await props.project.export()
  signal?.throwIfAborted()
  Object.entries(files).forEach(([path, file]) => {
    if (file == null) return
    zip.file(path, getZipEntry(file))
  })
  const zipped = await zip.generateAsync({ type: 'arraybuffer' })
  return { filesHash, zipped }
}

defineExpose({
  async run(signal?: AbortSignal) {
    loading.value = true
    registered.onStart()
    const projectData = await getProjectData(signal)
    zipData.value = projectData.zipped
    signal?.throwIfAborted()
    await until(() => !loading.value)
    return projectData.filesHash
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
