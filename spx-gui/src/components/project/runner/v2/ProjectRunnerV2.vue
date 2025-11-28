<script lang="ts">
const runnerBaseUrl = `/spx_${spxVersion}`
const runnerUrl = `${runnerBaseUrl}/runner.html`

const assetURLs = {
  // TODO: include these assets as "static asset" to generate immutable URLs
  'engineres.zip': `${runnerBaseUrl}/engineres.zip`,
  'gdspx.wasm': `${runnerBaseUrl}/gdspx.wasm`,
  'engine.wasm': `${runnerBaseUrl}/engine.wasm`,
  'engine.zip': `${runnerBaseUrl}/engine.zip`
}

// Log levels defined in spx/godot.editor.js
const logLevels = {
  LOG_LEVEL_VERBOSE: 0,
  LOG_LEVEL_LOG: 1,
  LOG_LEVEL_WARNING: 2,
  LOG_LEVEL_ERROR: 3,
  LOG_LEVEL_NONE: 4
}

type EngineConfig = {
  logLevel?: number
  useProfiler?: boolean
}

type RunnerFile = {
  /** File content as ArrayBuffer. */
  content: ArrayBuffer
  /** Last modified time in milliseconds since Unix epoch. */
  lastModified: number
}

/**
 * Files to be passed to the runner iframe.
 * Note: File entries only; directories should be omitted.
 */
type RunnerFiles = {
  [path: string]: RunnerFile
}

interface RunnerIframeWindow extends Window {
  setAIInteractionAPIEndpoint: (endpoint: string) => void
  setAIInteractionAPITokenProvider: (provider: () => Promise<string>) => void
  setAIDescription: (description: string) => void
  /** Init the engine. Can be called early; project-agnostic. */
  initEngine(assetURLs: Record<string, string>, config?: EngineConfig): Promise<void>
  /** Init the game with project files. Should be called after `initEngine`, before `startGame` or earlier (when files change, etc.). */
  initGame(files: RunnerFiles): Promise<void>
  /** Start to run the game. Should be called after `initGame` finished. */
  startGame(): Promise<void>
  /** Stop the running game. */
  stopGame(): Promise<void>
  onGameError: (callback: (err: string) => void) => void
  onGameExit: (callback: (code: number) => void) => void
  /** The engine crashed and failed to recover by itself. */
  onEngineCrash: (callback: (err: string) => void) => void
  console: typeof console
  /**
   * This property is used to detect if the iframe is reloaded.
   * It is set to `true` before reloading and reset to `false` after reloaded.
   */
  __xb_is_stale?: boolean
}

async function loadFiles(files: Files, reporter: ProgressReporter, signal?: AbortSignal) {
  const filesCollector = ProgressCollector.collectorFor(reporter, (info) => ({
    en: `Loading project files (${info.finishedNum}/${info.totalNum})...`,
    zh: `正在加载项目文件（${info.finishedNum}/${info.totalNum}）...`
  }))

  const runnerFiles: RunnerFiles = {}
  await Promise.all(
    Object.entries(files).map(async ([path, file]) => {
      if (file == null) return
      const r = filesCollector.getSubReporter()
      runnerFiles[path] = {
        content: await file.arrayBuffer(signal),
        lastModified: file.lastModified
      }
      r.report(1)
    })
  )
  return runnerFiles
}

/**
 * Ensure the latest UI updates to be synced to DOM & displayed to user.
 * This is necessary because now spx runs in the same thread as the main thread of editor.
 * After spx moved to standalone thread (see details in https://github.com/goplus/builder/issues/1496), timeout here can be removed.
 * P.S. It makes more sense to use `nextTick` (from vue) or `requestAnimationFrame` instead, while they do not work as expected.
 */
function uiUpdated(signal?: AbortSignal) {
  return timeout(50, signal)
}

// TODO: consider to call prefetch in some global place
export function prefetchProjectRunnerAssets() {
  Object.values(assetURLs).forEach((url) => {
    // Use `<link rel=prefetch>` instead of `<link rel=preload>`:
    // * `preload` indicates higher priority than `prefetch`. Preloaded content are expected to be used soon. For example, chrome will warn if the preloaded content is not used within 3 or 5 seconds. While project here will not be run until the user clicks some "run" button.
    // * `preload` results are not shared across different documents, while the iframe content is a different document. The "preloading" is meaningful only when the HTTP cache is shared, which is more like the case of `prefetch`.
    addPrefetchLink(url)
  })
}

/** Runner state */
type State =
  | {
      /** Initial state before any project has been run */
      type: 'initial'
    }
  | {
      /** Failed state when an error occurred during startup or runtime */
      type: 'failed'
      /** The error that caused the failure */
      err: unknown
    }
  | {
      /** Starting state before the project begins running */
      type: 'starting'
      /** Current loading progress */
      progress: Progress
    }
  | {
      /** Running state when the project is actively executing */
      type: 'running'
    }
</script>

<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, onBeforeUnmount, onUnmounted, ref, shallowReactive, shallowRef, watch } from 'vue'
import { spxVersion } from '@/utils/env'
import { timeout, untilNotNull } from '@/utils/utils'
import { ProgressCollector, ProgressReporter, type Progress } from '@/utils/progress'
import { useFileUrl } from '@/utils/file'
import { registerPlayer } from '@/utils/player-registry'
import { addPrefetchLink } from '@/utils/dom'
import type { Files } from '@/models/common/file'
import { hashFiles } from '@/models/common/hash'
import type { Project } from '@/models/project'
import { UIImg, UIDetailedLoading } from '@/components/ui'
import { apiBaseUrl } from '@/utils/env'
import { ensureAccessToken } from '@/stores/user'
import { isProjectUsingAIInteraction } from '@/utils/project'
import { Cancelled } from '@/utils/exception/base'

const props = defineProps<{ project: Project }>()

const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  exit: [code: number]
}>()

const [thumbnailUrl, thumbnailUrlLoading] = useFileUrl(() => props.project.thumbnail)
const state = shallowRef<State>({ type: 'initial' })
const runnerIframeRef = ref<HTMLIFrameElement>()
const runnerIframeWindowRef = ref<RunnerIframeWindow | null>(null)
let engineInitPromise: Promise<void> | null = null

watch(runnerIframeRef, (iframe) => {
  if (iframe == null) return
  const iframeWindow = iframe.contentWindow as RunnerIframeWindow | null
  if (iframeWindow == null) throw new Error('iframeWindow expected')

  handleIframeWindow(iframeWindow)
})

function handleIframeWindow(iframeWindow: RunnerIframeWindow) {
  iframeWindow.console.log = function (...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(...args)
    emit('console', 'log', args)
  }
  iframeWindow.console.warn = function (...args: unknown[]) {
    console.warn(...args)
    emit('console', 'warn', args)
  }

  function handleRunnerReady() {
    runnerIframeWindowRef.value = iframeWindow
    iframeWindow.onGameError((err: string) => {
      console.warn('ProjectRunner game error:', err)
      state.value = { type: 'failed', err }
    })
    iframeWindow.onGameExit((code: number) => {
      emit('exit', code)
    })
    iframeWindow.onEngineCrash((err: string) => {
      console.warn('ProjectRunner engine crash:', err)
      state.value = { type: 'failed', err }
      reloadIframe() // The engine crashed and failed to recover by itself, so we reload the iframe.
    })
    engineInitPromise = iframeWindow.initEngine(assetURLs, { logLevel: logLevels.LOG_LEVEL_ERROR, useProfiler: false })
    engineInitPromise.catch((err) => {
      console.warn('ProjectRunner init engine error:', err)
      state.value = { type: 'failed', err }
    })
  }

  // Handle the case where the `runnerReady` event may have already been dispatched
  // before this function is called. We check if the runner is ready by verifying
  // that `startGame` is defined. If so, we call `handleRunnerReady` immediately;
  // otherwise, we listen for the `runnerReady` event.
  if (typeof iframeWindow.startGame !== 'undefined') handleRunnerReady()
  else iframeWindow.addEventListener('runnerReady', handleRunnerReady)
}

let unmounted = false
onBeforeUnmount(() => {
  unmounted = true
})

async function reloadIframe() {
  const iframeWindow = runnerIframeWindowRef.value
  if (iframeWindow == null) return
  iframeWindow.__xb_is_stale = true
  iframeWindow.location.reload()
  runnerIframeWindowRef.value = null

  // As tested, though the `contentWindow` object is kept the same after reloading, the event listeners need to be reattached.
  // We need to wait for the reloaded iframe to be ready to reattach listeners.
  // While we haven't found reliable way to detect that. So we just wait until the `__xb_is_stale` is reset as a workaround.
  // TODO: Find a better way to achieve iframe reloading.
  let tries = 300 // Max wait for 30 seconds
  while (!unmounted && tries-- > 0) {
    await timeout(100)
    const newIframeWindow = runnerIframeRef.value?.contentWindow as RunnerIframeWindow | null | undefined
    if (newIframeWindow == null) continue
    if (!newIframeWindow.__xb_is_stale) {
      handleIframeWindow(newIframeWindow as RunnerIframeWindow)
      return
    }
  }
}

async function prepareAIInteraction(
  project: Project,
  iframeWindow: RunnerIframeWindow,
  reporter: ProgressReporter,
  signal?: AbortSignal
) {
  const isUsingAIInteraction = isProjectUsingAIInteraction(project)
  if (!isUsingAIInteraction) {
    reporter.report(1)
    return
  }
  const aiDescription = await project.ensureAIDescription(false, signal)
  if (engineInitPromise == null) throw new Error('engineInitPromise expected')
  await engineInitPromise
  iframeWindow.setAIDescription(aiDescription)
  iframeWindow.setAIInteractionAPIEndpoint(apiBaseUrl + '/ai/interaction')
  iframeWindow.setAIInteractionAPITokenProvider(async () => (await ensureAccessToken()) ?? '')
  reporter.report(1)
  return
}

const audioPlayerRegistered = registerPlayer(() => {
  // For now we don't need to implement stop handler here because there's no chance for
  // the user to activate another audio player when `ProjectRunner` visible.
  // If you see this warning in console, you need to think what the proper behavior is.
  console.warn('unexpected call')
})

watch(state, ({ type }) => {
  if (type === 'running') audioPlayerRegistered.onStart()
  else audioPlayerRegistered.onStopped()
})

let runPromise: Promise<unknown> | null = null
let runCtrl: AbortController | null = null
function getRunCtrl() {
  runCtrl?.abort(new Cancelled('new run'))
  const ctrl = new AbortController()
  runCtrl = ctrl
  return ctrl
}

onUnmounted(() => {
  runCtrl?.abort(new Cancelled('unmounted'))
})

async function runInternal(ctrl: AbortController) {
  const startingState = shallowReactive({ type: 'starting', progress: { percentage: 0, desc: null } } satisfies State)
  state.value = startingState
  const collector = new ProgressCollector()
  collector.onProgress(throttle((progress) => (startingState.progress = progress), 100))
  try {
    const iframeLoadReporter = collector.getSubReporter({ en: 'Preparing environment...', zh: '准备环境中...' }, 1)
    const initEngineReporter = collector.getSubReporter({ en: 'Initializing engine...', zh: '初始化引擎中...' }, 1)
    const getProjectDataReporter = collector.getSubReporter(
      { en: 'Loading project data...', zh: '加载项目数据中...' },
      5
    )
    const prepareAIInteractionReporter = collector.getSubReporter(
      { en: 'Preparing AI Interaction data...', zh: '准备 AI 交互数据中...' },
      5
    )
    const initGameReporter = collector.getSubReporter({ en: 'Initializing project...', zh: '初始化项目中...' }, 5)
    const startGameReporter = collector.getSubReporter({ en: 'Starting project...', zh: '启动项目中...' }, 5)

    const files = props.project.exportGameFiles()

    const iframeWindow = await untilNotNull(runnerIframeWindowRef, ctrl.signal)
    iframeLoadReporter.report(1)

    if (engineInitPromise == null) throw new Error('engineInitPromise expected')

    await Promise.all([
      Promise.all([
        engineInitPromise.then(() => initEngineReporter.report(1)),
        loadFiles(files, getProjectDataReporter, ctrl.signal)
      ]).then(async ([_, runnerFiles]) => {
        await uiUpdated(ctrl.signal)
        await iframeWindow.initGame(runnerFiles)
        ctrl.signal.throwIfAborted()
        initGameReporter.report(1)
      }),
      prepareAIInteraction(props.project, iframeWindow, prepareAIInteractionReporter, ctrl.signal)
    ])

    await uiUpdated(ctrl.signal)

    // TODO: get progress for engine-loading, which is now included in `startGame`
    startGameReporter.startAutoReport(10 * 1000)
    await iframeWindow.startGame()
    ctrl.signal.throwIfAborted()
    startGameReporter.report(1)
    state.value = { type: 'running' }
    return hashFiles(files, ctrl.signal)
  } catch (err) {
    if (err instanceof Cancelled) throw err
    console.warn('ProjectRunner run game error:', err)
    state.value = { type: 'failed', err }
  }
}

const startingProgress = computed(() => {
  if (state.value.type !== 'starting') return null
  return state.value.progress
})

defineExpose({
  async run() {
    const ctrl = getRunCtrl()
    const promise = runInternal(ctrl)
    runPromise = promise
    return promise.finally(() => {
      if (runPromise === promise) runPromise = null
    })
  },
  async stop() {
    const promise = runPromise
    runCtrl?.abort(new Cancelled('stop'))
    if (promise != null) await promise.catch(() => {})

    const iframeWindow = runnerIframeWindowRef.value
    if (iframeWindow == null) return
    await iframeWindow.stopGame()
    state.value = { type: 'initial' }
  },
  async rerun() {
    await this.stop()
    return this.run()
  }
})
</script>

<template>
  <div class="iframe-container">
    <iframe ref="runnerIframeRef" class="iframe" frameborder="0" :src="runnerUrl" />
    <UIImg v-show="state.type !== 'running'" class="thumbnail" :src="thumbnailUrl" :loading="thumbnailUrlLoading" />
    <UIDetailedLoading :visible="startingProgress != null" cover :percentage="startingProgress?.percentage ?? 0">
      <span>{{ $t(startingProgress?.desc ?? { en: 'Loading...', zh: '加载中...' }) }}</span>
    </UIDetailedLoading>
    <div v-show="state.type === 'failed'" class="error-wrapper">
      <div class="error">
        <svg width="81" height="80" viewBox="0 0 81 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10.3422 18.9098C10.3422 19.3332 10.5103 19.7392 10.8097 20.0386C11.1091 20.3379 11.5151 20.5061 11.9385 20.5061C12.3619 20.5061 12.7679 20.3379 13.0673 20.0386C13.3666 19.7392 13.5348 19.3332 13.5348 18.9098C13.5348 18.4864 13.3666 18.0804 13.0673 17.781C12.7679 17.4817 12.3619 17.3135 11.9385 17.3135C11.5151 17.3135 11.1091 17.4817 10.8097 17.781C10.5103 18.0804 10.3422 18.4864 10.3422 18.9098Z"
            fill="white"
          />
          <path
            d="M16.3168 18.9098C16.3168 19.3332 16.485 19.7392 16.7843 20.0386C17.0837 20.3379 17.4897 20.5061 17.9131 20.5061C18.3365 20.5061 18.7425 20.3379 19.0419 20.0386C19.3412 19.7392 19.5094 19.3332 19.5094 18.9098C19.5094 18.4864 19.3412 18.0804 19.0419 17.781C18.7425 17.4817 18.3365 17.3135 17.9131 17.3135C17.4897 17.3135 17.0837 17.4817 16.7843 17.781C16.485 18.0804 16.3168 18.4864 16.3168 18.9098Z"
            fill="white"
          />
          <path
            d="M22.2914 18.9098C22.2914 19.3332 22.4596 19.7392 22.7589 20.0386C23.0583 20.3379 23.4643 20.5061 23.8877 20.5061C24.3111 20.5061 24.7171 20.3379 25.0165 20.0386C25.3158 19.7392 25.484 19.3332 25.484 18.9098C25.484 18.4864 25.3158 18.0804 25.0165 17.781C24.7171 17.4817 24.3111 17.3135 23.8877 17.3135C23.4643 17.3135 23.0583 17.4817 22.7589 17.781C22.4596 18.0804 22.2914 18.4864 22.2914 18.9098Z"
            fill="white"
          />
          <path
            d="M72.1018 69.0504H8.89816C7.73163 69.0469 6.61397 68.5815 5.78972 67.756C4.96547 66.9305 4.50175 65.8122 4.5 64.6456V15.4048C4.5 14.2377 4.96316 13.1183 5.78779 12.2925C6.61241 11.4666 7.73109 11.0018 8.89816 11H72.1018C73.2689 11.0018 74.3876 11.4666 75.2122 12.2925C76.0368 13.1183 76.5 14.2377 76.5 15.4048V64.6456C76.4983 65.8122 76.0345 66.9305 75.2103 67.756C74.386 68.5815 73.2684 69.0469 72.1018 69.0504ZM8.89816 13.3183C8.34594 13.3201 7.81694 13.5407 7.42708 13.9318C7.03722 14.3229 6.8183 14.8526 6.81831 15.4048V64.6456C6.8183 65.1979 7.03722 65.7276 7.42708 66.1187C7.81694 66.5098 8.34594 66.7304 8.89816 66.7321H72.1018C72.6541 66.7304 73.1831 66.5098 73.5729 66.1187C73.9628 65.7276 74.1817 65.1979 74.1817 64.6456V15.4048C74.1817 14.8526 73.9628 14.3229 73.5729 13.9318C73.1831 13.5407 72.6541 13.3201 72.1018 13.3183H8.89816Z"
            fill="white"
          />
          <path
            d="M57.0276 48.184L57.0713 48.1177L44.9062 27.8155H44.8516C44.4374 27.0848 43.8359 26.4777 43.1091 26.0566C42.3822 25.6355 41.5563 25.4158 40.7164 25.42C39.8765 25.4159 39.0508 25.6357 38.3241 26.0568C37.5974 26.4778 36.996 27.0849 36.5819 27.8155H36.5272L24.8518 47.4224C24.2969 48.1766 23.9967 49.0879 23.9948 50.0242C23.9948 52.535 26.1083 54.5719 28.7152 54.5719C28.8318 54.5719 28.9411 54.5472 29.0548 54.5392L29.0738 54.5719H52.7488L52.751 54.569C55.3426 54.5515 57.4387 52.5248 57.4387 50.0235C57.4364 49.3878 57.2962 48.7602 57.0276 48.184Z"
            fill="#0BC0CF"
          />
          <path
            d="M40.7171 32.707C41.6018 32.707 42.0442 33.1494 42.0442 34.0342V43.8737C42.0442 44.7585 41.6018 45.2008 40.7171 45.2008C39.8323 45.2008 39.3899 44.7585 39.3899 43.8737V34.0342C39.3899 33.1494 39.8323 32.707 40.7171 32.707Z"
            fill="white"
          />
          <path
            d="M39.1246 49.8845C39.1246 50.0897 39.1657 50.2928 39.2457 50.4824C39.3257 50.6719 39.443 50.8441 39.5909 50.9892C39.7388 51.1343 39.9143 51.2494 40.1076 51.3279C40.3008 51.4064 40.5079 51.4468 40.7171 51.4468C40.9262 51.4468 41.1333 51.4064 41.3266 51.3279C41.5198 51.2494 41.6954 51.1343 41.8433 50.9892C41.9911 50.8441 42.1084 50.6719 42.1884 50.4824C42.2684 50.2928 42.3096 50.0897 42.3095 49.8845C42.3096 49.6794 42.2684 49.4763 42.1884 49.2867C42.1084 49.0972 41.9911 48.925 41.8433 48.7799C41.6954 48.6348 41.5198 48.5197 41.3266 48.4412C41.1333 48.3627 40.9262 48.3223 40.7171 48.3223C40.5079 48.3223 40.3008 48.3627 40.1076 48.4412C39.9143 48.5197 39.7388 48.6348 39.5909 48.7799C39.443 48.925 39.3257 49.0972 39.2457 49.2867C39.1657 49.4763 39.1246 49.6794 39.1246 49.8845Z"
            fill="white"
          />
        </svg>
        <p>
          {{ $t({ en: 'Failed to run project', zh: '项目运行失败' }) }}
        </p>
      </div>
    </div>
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
.error-wrapper {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: url(./error-bg.svg);

  .error {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--ui-color-grey-100);
    background-color: rgba(0, 0, 0, 0.65);
  }
}
</style>
