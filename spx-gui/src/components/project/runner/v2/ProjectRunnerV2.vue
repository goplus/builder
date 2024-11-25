<script setup lang="ts">
import { onUnmounted, ref, shallowRef, watch } from 'vue'
import JSZip from 'jszip'
import { untilNotNull } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { useFileUrl } from '@/utils/file'
import { registerPlayer } from '@/utils/player-registry'
import type { File, Files } from '@/models/common/file'
import { hashFile } from '@/models/common/hash'
import type { Project } from '@/models/project'
import { UIImg, UILoading } from '@/components/ui'

const runnerVersion = '20241121_2139'
const runnerBaseUrl = `/runner/${runnerVersion}/`
const runnerUrl = `${runnerBaseUrl}runner.html`

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  loaded: []
}>()

const loading = ref(true)
const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)

interface IframeWindow extends Window {
  startProject(
    buffer: ArrayBuffer,
    projectName: string,
    showEditor: boolean,
    assetURLs: Record<string, string>
  ): Promise<void>
  updateProject(buffer: ArrayBuffer, addInfos: string[], deleteInfos: string[], updateInfos: string[]): Promise<void>
  stopProject(): Promise<void>
  runGame(): Promise<void>
  stopGame(): Promise<void>
  console: typeof console
}

const iframeRef = ref<HTMLIFrameElement>()
const iframeWindowRef = ref<IframeWindow>()

watch(iframeRef, (iframe) => {
  if (iframe == null) return
  const iframeWindow = iframe.contentWindow as IframeWindow | null
  if (iframeWindow == null) throw new Error('iframeWindow expected')

  // Currently, there are many unrelated logs in the runner page console, so we are not forwarding them.
  // TODO: Clean up the console logs in the runner page and forward them here.
  // iframeWindow.console.log = function (...args: unknown[]) {
  //   // eslint-disable-next-line no-console
  //   console.log(...args)
  //   emit('console', 'log', args)
  // }
  // iframeWindow.console.warn = function (...args: unknown[]) {
  //   console.warn(...args)
  //   emit('console', 'warn', args)
  // }

  iframeWindow.addEventListener('runnerReady', () => {
    // eslint-disable-next-line no-console
    console.debug('[ProjectRunnerV2]', 'runnerReady')
    iframeWindowRef.value = iframeWindow
    emit('loaded')
  })
})

const lastFiles = shallowRef<Files>({})

async function getProjectData() {
  // NOTE: Now runner (spx2) relies on the zip file hash to determine if the game content has changed.
  // While jszip can't guarantee the zip result to be byte-to-byte equal, even if we use the same input & pass in same `date` for each file.
  // TODO: Figure out why and fix it, or update the runner not to rely on the zip file hash.
  const zip = new JSZip()
  const [, files] = await props.project.export()
  Object.entries(files).forEach(([path, file]) => {
    if (file != null) zip.file(path, file.arrayBuffer())
  })
  const zipData = await zip.generateAsync({ type: 'arraybuffer' })
  return [files, zipData] as const
}

async function getUpdateInfo(
  oldFiles: Files,
  newFiles: Files
): Promise<[toAdd: string[], toDelete: string[], toUpdate: string[]]> {
  const fileHashs = new Map<File, string>()
  const files = new Set([...Object.values(oldFiles), ...Object.values(newFiles)])
  await Promise.all(
    [...files].map(async (file) => {
      if (file == null) return
      const hash = await hashFile(file)
      fileHashs.set(file, hash)
    })
  )
  const toAdd: string[] = []
  const toDelete: string[] = []
  const toUpdate: string[] = []
  Object.entries(oldFiles).forEach(([path, file]) => {
    if (file == null) return
    const newFile = newFiles[path]
    if (newFile == null) {
      toDelete.push(path)
      return
    }
    const oldHash = fileHashs.get(file)
    const newHash = fileHashs.get(newFile)
    if (oldHash !== newHash) toUpdate.push(path)
  })
  Object.entries(newFiles).forEach(([path, file]) => {
    if (file == null) return
    const oldFile = oldFiles[path]
    if (oldFile == null) toAdd.push(path)
  })
  return [toAdd, toDelete, toUpdate]
}

// @JiepengTan: only digits and en letters are accepted
function encodeProjectNameComponent(comp: string) {
  return comp
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('')
}

// @JiepengTan: use `_` to separate owner and name to simplify cache management
function encodeProjectName(project: Project) {
  const owner = project.owner ?? 'anonymous'
  const name = project.name ?? ''
  return `${encodeProjectNameComponent(owner)}_${encodeProjectNameComponent(name)}`
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

const iframeWindowWithProjectStartedRef = ref<IframeWindow>()

watch(
  () => props.project,
  async (project, _prevProject, onCleanup) => {
    const signal = getCleanupSignal(onCleanup)
    const iframeWindow = await untilNotNull(iframeWindowRef)
    signal.throwIfAborted()

    const [files, zipData] = await getProjectData()
    signal.throwIfAborted()
    const projectName = encodeProjectName(project)
    // We should not need to wait startProject to finish here, it's a bug of the runner page.
    // TODO: remove `await` here after this bug fixed.
    await withLog(
      'startProject',
      iframeWindow.startProject(zipData, projectName, false, {
        'gdspx.wasm': 'gdspx.wasm',
        'godot.editor.wasm': 'godot.editor.wasm'
      })
    )
    lastFiles.value = files
    iframeWindowWithProjectStartedRef.value = iframeWindow
    signal.addEventListener('abort', () => {
      withLog('stopProject', iframeWindow.stopProject())
    })
  },
  { immediate: true }
)

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
    const iframeWindow = await untilNotNull(iframeWindowWithProjectStartedRef)
    const [files, zipData] = await getProjectData()
    // TODO: update project when game content changed, instead of waiting for `run` being called.
    const updateInfo = await getUpdateInfo(lastFiles.value, files)
    if (updateInfo.some((info) => info.length > 0)) {
      // eslint-disable-next-line no-console
      console.debug('[ProjectRunnerV2] updateProject with', ...updateInfo)
      // await withLog('updateProject', iframeWindow.updateProject(zipData, ...updateInfo))
      withLog('updateProject', iframeWindow.updateProject(zipData, ...updateInfo))
    }
    await withLog('runGame', iframeWindow.runGame())
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
