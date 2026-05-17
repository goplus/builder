<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

import type { Project } from '@/data/mock'

type RunnerFile = {
  content: ArrayBuffer
  lastModified: number
}

type RunnerFiles = Record<string, RunnerFile>

type RunnerIframeWindow = Window & {
  initEngine?: (assetURLs: Record<string, string>, config?: Record<string, unknown>) => Promise<void>
  initGame?: (files: RunnerFiles) => Promise<void>
  startGame?: () => Promise<void>
  stopGame?: () => Promise<void>
  onGameError?: (callback: (err: string) => void) => void
  onGameExit?: (callback: (code: number) => void) => void
  onEngineCrash?: (callback: (err: string) => void) => void
}

type Fflate = {
  unzipSync: (data: Uint8Array) => Record<string, Uint8Array>
}

const props = defineProps<{
  project: Project
  showControls?: boolean
}>()

const runnerBaseUrl = '/spx_2.0.0'
const runnerUrl = `${runnerBaseUrl}/runner.html`
const assetURLs = {
  'engineres.zip': `${runnerBaseUrl}/game.zip`,
  'game.zip': `${runnerBaseUrl}/game.zip`,
  'ispx.wasm': `${runnerBaseUrl}/ispx.wasm`,
  'engine.wasm': `${runnerBaseUrl}/engine.wasm`,
  'engine.zip': `${runnerBaseUrl}/engine.zip`
}

const iframeRef = ref<HTMLIFrameElement>()
const state = ref<'initial' | 'loading' | 'running' | 'failed'>('initial')
const message = ref('')
const canRun = computed(() => props.project.projectFile != null)

let runToken = 0
let engineInitialized = false

function getRunnerWindow() {
  return iframeRef.value?.contentWindow as RunnerIframeWindow | null | undefined
}

function waitForRunnerReady(iframeWindow: RunnerIframeWindow) {
  if (typeof iframeWindow.startGame === 'function') return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      iframeWindow.removeEventListener('runnerReady', handleReady)
      reject(new Error('Project runner did not become ready in time.'))
    }, 15000)

    function handleReady() {
      window.clearTimeout(timeout)
      iframeWindow.removeEventListener('runnerReady', handleReady)
      resolve()
    }

    iframeWindow.addEventListener('runnerReady', handleReady)
  })
}

function loadFflate() {
  const existing = (window as Window & { fflate?: Fflate }).fflate
  if (existing != null) return Promise.resolve(existing)

  return new Promise<Fflate>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${runnerBaseUrl}/fflate.js`
    script.async = true
    script.onload = () => {
      const loaded = (window as Window & { fflate?: Fflate }).fflate
      if (loaded == null) {
        reject(new Error('Failed to load local zip reader.'))
        return
      }
      resolve(loaded)
    }
    script.onerror = () => reject(new Error('Failed to load local zip reader.'))
    document.head.append(script)
  })
}

async function loadProjectFiles(projectFile: string): Promise<RunnerFiles> {
  const [fflate, response] = await Promise.all([loadFflate(), fetch(projectFile)])
  if (!response.ok) throw new Error(`Failed to load local project file: ${response.status}`)

  const zipEntries = fflate.unzipSync(new Uint8Array(await response.arrayBuffer()))
  const lastModified = Date.now()
  const files: RunnerFiles = {}

  for (const [path, bytes] of Object.entries(zipEntries)) {
    if (path.endsWith('/')) continue
    const content = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(content).set(bytes)
    files[path] = {
      content,
      lastModified
    }
  }

  return files
}

async function run() {
  if (props.project.projectFile == null) return

  const token = ++runToken
  state.value = 'loading'
  message.value = 'Loading local project...'

  try {
    await nextTick()
    const iframeWindow = getRunnerWindow()
    if (iframeWindow == null) throw new Error('Project runner iframe is not available.')

    await waitForRunnerReady(iframeWindow)
    if (token !== runToken) return

    iframeWindow.onGameError?.((err) => {
      state.value = 'failed'
      message.value = err
    })
    iframeWindow.onEngineCrash?.((err) => {
      state.value = 'failed'
      message.value = err
    })
    iframeWindow.onGameExit?.(() => {
      state.value = 'initial'
      message.value = ''
    })

    message.value = 'Preparing engine...'
    await iframeWindow.initEngine?.(assetURLs, { logLevel: 3, useProfiler: false })
    engineInitialized = true
    if (token !== runToken) return

    message.value = 'Opening project...'
    await iframeWindow.initGame?.(await loadProjectFiles(props.project.projectFile))
    if (token !== runToken) return

    message.value = 'Starting...'
    await iframeWindow.startGame?.()
    if (token !== runToken) return

    state.value = 'running'
    message.value = ''
  } catch (err) {
    state.value = 'failed'
    message.value = err instanceof Error ? err.message : String(err)
  }
}

async function stop() {
  runToken += 1
  if (engineInitialized) await getRunnerWindow()?.stopGame?.()
  state.value = 'initial'
  message.value = ''
}

async function rerun() {
  await stop()
  await run()
}

onBeforeUnmount(() => {
  runToken += 1
  if (engineInitialized) getRunnerWindow()?.stopGame?.()
})

defineExpose({
  run,
  stop,
  rerun
})
</script>

<template>
  <div class="relative size-full overflow-hidden rounded-lg bg-grey-1000">
    <iframe
      ref="iframeRef"
      class="absolute inset-0 size-full border-0"
      :class="{ 'opacity-0': state !== 'running' }"
      :src="runnerUrl"
      title="Local project runner"
    ></iframe>

    <div v-if="state !== 'running'" class="absolute inset-0">
      <img class="size-full object-cover" :src="project.thumbnail" :alt="project.title" />
      <div class="absolute inset-0 bg-[rgb(0_0_0/0.18)]"></div>
      <div class="absolute inset-0 grid place-items-center p-6 text-center">
        <div class="max-w-88 rounded-lg bg-grey-100 p-5 shadow-lg">
          <h3 class="m-0 text-lg font-medium text-title">{{ project.title }}</h3>
          <p v-if="state === 'failed'" class="mt-2 text-sm leading-5 text-red-600">{{ message }}</p>
          <p v-else-if="message" class="mt-2 text-sm leading-5 text-hint-2">{{ message }}</p>
          <p v-else-if="project.instructions" class="mt-2 text-sm leading-5 text-hint-2">{{ project.instructions }}</p>
          <div class="mt-4 flex justify-center gap-2">
            <button
              v-if="canRun"
              class="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white"
              type="button"
              :disabled="state === 'loading'"
              @click="run"
            >
              {{ state === 'loading' ? 'Loading' : state === 'failed' ? 'Retry' : 'Run' }}
            </button>
            <a
              v-if="project.projectFile"
              class="rounded-md border border-grey-400 bg-grey-100 px-4 py-2 text-sm text-title no-underline"
              :href="project.projectFile"
              :download="`${project.name}.xbp`"
            >
              XBP
            </a>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="props.showControls !== false" class="absolute top-3 right-3 flex gap-2">
      <button class="rounded-md bg-grey-100 px-3 py-1.5 text-sm text-title shadow-sm" type="button" @click="rerun">Rerun</button>
      <button class="rounded-md bg-grey-100 px-3 py-1.5 text-sm text-title shadow-sm" type="button" @click="stop">Stop</button>
    </div>
  </div>
</template>
