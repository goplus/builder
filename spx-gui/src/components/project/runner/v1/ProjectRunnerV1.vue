<template>
  <div class="iframe-container">
    <IframeDisplay
      v-if="zipData"
      :zip-data="zipData"
      @console="handleConsole"
      @loaded="loading = false"
      @progress="(p) => startProjectReporter.report(p)"
    />
    <UIImg v-show="zipData == null || loading" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UIDetailedLoading :visible="loading" cover :percentage="progressRef.percentage">
      <span>{{ $t(progressRef.desc ?? { en: 'Loading...', zh: '加载中' }) }}</span>
    </UIDetailedLoading>
  </div>
</template>

<script lang="ts">
const zipEntryCache = new WeakMap<File, Promise<Blob>>()

function getZipEntry(file: File, reporter: ProgressReporter) {
  if (zipEntryCache.has(file)) {
    reporter.report(1)
    return zipEntryCache.get(file)!
  }
  const collector = ProgressCollector.collectorFor(reporter)
  const toNativeFileReporter = collector.getSubReporter({ en: 'Downloading file...', zh: '下载文件中...' }, 5)
  const toPngReporter = collector.getSubReporter({ en: 'Processing image...', zh: '处理图片中...' }, 1)
  const zipEntry = toNativeFile(file).then(async (blob: Blob) => {
    toNativeFileReporter.report(1)
    // For svg files, we convert them to png before sending to spx (v1):
    // 1. Compatibility: Many SVG features are not supported in spx v1
    // 2. Improve performance: SVG rendering is slow in spx v1
    if (blob.type === 'image/svg+xml') blob = await toPng(blob)
    toPngReporter.report(1)
    return blob
  })
  zipEntryCache.set(file, zipEntry)
  zipEntry.catch(() => zipEntryCache.delete(file))
  return zipEntry
}
</script>

<script lang="ts" setup>
import { throttle } from 'lodash'
import { onMounted, onUnmounted, ref } from 'vue'
import JSZip from 'jszip'
import { registerPlayer } from '@/utils/player-registry'
import { until } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { type Progress, ProgressReporter, ProgressCollector } from '@/utils/progress'
import { toPng } from '@/utils/img'
import { File, toNativeFile } from '@/models/common/file'
import { Project } from '@/models/project'
import { UIImg, UIDetailedLoading } from '@/components/ui'
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

async function getProjectData(signal: AbortSignal | undefined, reporter: ProgressReporter) {
  const collector = ProgressCollector.collectorFor(reporter)
  const projectExportReporter = collector.getSubReporter({ en: 'Exporting project...', zh: '导出项目中...' }, 1)
  const filesDesc = { en: 'Loading project files...', zh: '加载项目文件中...' }
  const filesReporter = collector.getSubReporter(filesDesc, 10)
  const zipReporter = collector.getSubReporter({ en: 'Zipping project files...', zh: '打包项目文件中...' }, 1)

  const [{ filesHash }, files] = await props.project.export()
  signal?.throwIfAborted()
  projectExportReporter.report(1)

  const zip = new JSZip()
  const filesCollector = ProgressCollector.collectorFor(filesReporter, filesDesc)
  Object.entries(files).forEach(([path, file], i) => {
    if (file == null) return
    zip.file(path, getZipEntry(file, filesCollector.getSubReporter()))
  })

  const zipped = await zip.generateAsync({ type: 'arraybuffer' })
  zipReporter.report(1)

  return { filesHash, zipped }
}

const collector = new ProgressCollector()
const getProjectDataReporter = collector.getSubReporter({ en: 'Loading project data...', zh: '加载项目数据中...' }, 2)
const startProjectReporter = collector.getSubReporter({ en: 'Starting project...', zh: '正在启动项目...' }, 1)

const progressRef = ref<Progress>({ percentage: 0, desc: null })
collector.onProgress(throttle((p) => (progressRef.value = p), 100))

defineExpose({
  async run(signal?: AbortSignal) {
    loading.value = true
    registered.onStart()
    const projectData = await getProjectData(signal, getProjectDataReporter)
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
