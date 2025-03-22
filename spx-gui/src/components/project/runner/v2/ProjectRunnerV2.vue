<script setup lang="ts">
import { throttle } from 'lodash'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import JSZip from 'jszip'
import { spxVersion } from '@/utils/env'
import { timeout, untilNotNull } from '@/utils/utils'
import { ProgressCollector, ProgressReporter, type Progress } from '@/utils/progress'
import { useFileUrl } from '@/utils/file'
import { registerPlayer } from '@/utils/player-registry'
import { addPrefetchLink } from '@/utils/dom'
import { toNativeFile } from '@/models/common/file'
import type { Project } from '@/models/project'
import { UIImg, UIDetailedLoading } from '@/components/ui'

const runnerBaseUrl = `/spx_${spxVersion}`
const runnerUrl = `${runnerBaseUrl}/runner.html`

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const loading = ref(false)
const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)

interface IframeWindow extends Window {
  startGame(buffer: ArrayBuffer, assetURLs: Record<string, string>): Promise<void>
  stopGame(): Promise<void>
  console: typeof console
}

const iframeRef = ref<HTMLIFrameElement>()
const iframeWindowRef = ref<IframeWindow>()

watch(iframeRef, (iframe) => {
  if (iframe == null) return
  const iframeWindow = iframe.contentWindow as IframeWindow | null
  if (iframeWindow == null) throw new Error('iframeWindow expected')

  // TODO: Clean up console logs in the runner page
  iframeWindow.console.log = function (...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(...args)
    emit('console', 'log', args)
  }
  iframeWindow.console.warn = function (...args: unknown[]) {
    console.warn(...args)
    emit('console', 'warn', args)
  }

  iframeWindow.addEventListener('runnerReady', () => {
    // eslint-disable-next-line no-console
    console.debug('[ProjectRunnerV2]', 'runnerReady')
    iframeWindowRef.value = iframeWindow
  })
})

async function getProjectData(reporter: ProgressReporter, signal?: AbortSignal) {
  const collector = ProgressCollector.collectorFor(reporter)
  const projectExportReporter = collector.getSubReporter(
    { en: 'Counting project files...', zh: '清点项目文件中...' },
    1
  )
  const filesDesc = { en: 'Loading project files...', zh: '加载项目文件中...' }
  const filesReporter = collector.getSubReporter(filesDesc, 10)
  const zipReporter = collector.getSubReporter({ en: 'Zipping project files...', zh: '打包项目文件中...' }, 1)

  const [{ filesHash }, files] = await props.project.export()
  signal?.throwIfAborted()
  projectExportReporter.report(1)

  const zip = new JSZip()
  const filesCollector = ProgressCollector.collectorFor(filesReporter, filesDesc)
  Object.entries(files).forEach(([path, file]) => {
    if (file == null) return
    const r = filesCollector.getSubReporter()
    const nativeFile = toNativeFile(file).then((f) => (r.report(1), f))
    zip.file(path, nativeFile)
  })

  const zipped = await zip.generateAsync({ type: 'arraybuffer' })
  signal?.throwIfAborted()
  zipReporter.report(1)

  return { filesHash, zipped }
}

function withLog(methodName: string, promise: Promise<unknown>) {
  // eslint-disable-next-line no-console
  console.debug('[ProjectRunnerV2]', methodName)
  promise.then(
    () => {
      // eslint-disable-next-line no-console
      console.debug('[ProjectRunnerV2]', `${methodName} done`)
    },
    (err) => {
      console.error('[ProjectRunnerV2]', `${methodName} failed`, err)
    }
  )
  return promise
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

const assetURLs = {
  // TODO: include these assets as "static asset" to generate immutable URLs
  'engineres.zip': `${runnerBaseUrl}/engineres.zip`,
  'gdspx.wasm': `${runnerBaseUrl}/gdspx.wasm`,
  'godot.editor.wasm': `${runnerBaseUrl}/godot.editor.wasm`
}

onMounted(() => {
  Object.values(assetURLs).forEach((url) => {
    // Use `<link rel=prefetch>` instead of `<link rel=preload>`:
    // * `preload` indicates higher priority than `prefetch`. Preloaded content are expected to be used soon. For example, chrome will warn if the preloaded content is not used within 3 or 5 seconds. While project here will not be runned until the user clicks some "run" button.
    // * `preload` results are not shared across different documents, while the iframe content is a different document. The "preloading" is meaningful only when the HTTP cache is shared, which is more like the case of `prefetch`.
    addPrefetchLink(url)
  })
})

const progressRef = ref<Progress>({ percentage: 0, desc: null })

defineExpose({
  async run(signal?: AbortSignal) {
    loading.value = true
    const collector = new ProgressCollector()
    collector.onProgress(throttle((progress) => (progressRef.value = progress), 100))
    const iframeLoadReporter = collector.getSubReporter({ en: 'Preparing enviroment...', zh: '准备环境中...' }, 1)
    const getProjectDataReporter = collector.getSubReporter(
      { en: 'Loading project data...', zh: '加载项目数据中...' },
      5
    )
    const startGameReporter = collector.getSubReporter({ en: 'Starting project...', zh: '开始运行项目...' }, 5)

    registered.onStart()

    const iframeWindow = await untilNotNull(iframeWindowRef)
    signal?.throwIfAborted()
    iframeLoadReporter.report(1)

    const projectData = await getProjectData(getProjectDataReporter, signal)

    // Ensure the latest progress update to be rendered to UI
    // This is necessary because now spx runs in the same thread as the main thread of editor.
    // After spx moved to standalone thread (see details in https://github.com/goplus/builder/issues/1496), timeout here can be removed.
    // P.S. It makes more sense to use `nextTick` (from vue) instead, while that does not work as expected.
    await timeout(50)

    // TODO: get progress for engine-loading, which is now included in `startGame`
    startGameReporter.startAutoReport(10 * 1000)
    await withLog('startGame', iframeWindow.startGame(projectData.zipped, assetURLs))
    signal?.throwIfAborted()
    startGameReporter.report(1)

    loading.value = false
    return projectData.filesHash
  },
  async stop() {
    const iframeWindow = iframeWindowRef.value
    if (iframeWindow == null) return
    await withLog('stopGame', iframeWindow.stopGame())
    registered.onStopped()
  },
  async rerun() {
    await this.stop()
    return this.run()
  }
})
</script>

<template>
  <div class="iframe-container">
    <iframe ref="iframeRef" class="iframe" frameborder="0" :src="runnerUrl" />
    <UIImg v-show="progressRef.percentage !== 1" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UIDetailedLoading :visible="loading" cover :percentage="progressRef.percentage">
      <span>{{ $t(progressRef.desc ?? { en: 'Loading...', zh: '加载中' }) }}</span>
    </UIDetailedLoading>
  </div>
</template>

<style lang="scss" scoped>
.iframe-container {
  position: relative;
  aspect-ratio: 4 / 3;
  display: flex;
  justify-content: center;
  align-items: center;
}
.iframe {
  width: 100%;
  height: 100%;
}
.thumbnail {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
</style>
