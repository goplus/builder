<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import JSZip from 'jszip'
import { spxVersion } from '@/utils/env'
import { untilNotNull } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { registerPlayer } from '@/utils/player-registry'
import { addPrefetchLink } from '@/utils/dom'
import { toNativeFile } from '@/models/common/file'
import type { Project } from '@/models/project'
import { UIImg, UILoading } from '@/components/ui'

const runnerBaseUrl = `/spx_${spxVersion}`
const runnerUrl = `${runnerBaseUrl}/runner.html`

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const loading = ref(true)
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

async function getProjectData() {
  const zip = new JSZip()
  const [, files] = await props.project.export()
  Object.entries(files).forEach(([path, file]) => {
    if (file != null) zip.file(path, toNativeFile(file))
  })
  return zip.generateAsync({ type: 'arraybuffer' })
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

defineExpose({
  async run(signal?: AbortSignal) {
    loading.value = true
    registered.onStart()
    const iframeWindow = await untilNotNull(iframeWindowRef)
    signal?.throwIfAborted()
    const projectData = await getProjectData()
    signal?.throwIfAborted()
    await withLog('startGame', iframeWindow.startGame(projectData, assetURLs))
    signal?.throwIfAborted()
    loading.value = false
  },
  async stop() {
    const iframeWindow = iframeWindowRef.value
    if (iframeWindow == null) return
    await withLog('stopGame', iframeWindow.stopGame())
    registered.onStopped()
  },
  async rerun() {
    await this.stop()
    await this.run()
  }
})
</script>

<template>
  <div class="iframe-container">
    <iframe ref="iframeRef" class="iframe" frameborder="0" :src="runnerUrl" />
    <UIImg v-show="loading" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UILoading :visible="loading" cover />
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
