<template>
  <UICard
    v-radar="{ name: 'editor-preview', desc: 'Preview panel for stage preview and project running' }"
    class="editor-preview relative flex flex-col overflow-hidden"
    :class="{ 'flex-[1_1_0] min-h-0': simpleMode }"
  >
    <UICardHeader v-if="!simpleMode" class="gap-3">
      <div class="flex-1 text-title">
        {{ $t(headerTitle) }}
      </div>
      <template v-if="runnerState === 'initial'">
        <UIButton
          v-radar="{ name: 'run-button', desc: 'Click to run the project in debug mode' }"
          type="primary"
          icon="playHollow"
          :loading="handleRun.isLoading.value"
          @click="handleRun.fn"
        >
          {{ $t({ en: 'Run', zh: '运行' }) }}
        </UIButton>

        <UIButton
          v-show="canManageProject"
          v-radar="{ name: 'publish-button', desc: 'Click to publish the project' }"
          type="secondary"
          icon="publish"
          :disabled="!isOnline"
          @click="handlePublishProject"
        >
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
      </template>
      <template v-else>
        <UIButton
          v-radar="{ name: 'rerun-button', desc: 'Click to rerun the project' }"
          type="primary"
          icon="rotate"
          :disabled="runnerState !== 'running' || handleStop.isLoading.value"
          :loading="handleRerun.isLoading.value && !handleStop.isLoading.value"
          @click="handleRerun.fn"
        >
          {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'stop-button', desc: 'Click to stop the running project' }"
          type="neutral"
          icon="end"
          :loading="handleStop.isLoading.value"
          @click="handleStop.fn"
        >
          {{ $t({ en: 'Stop', zh: '停止' }) }}
        </UIButton>
        <UITooltip placement="top-end">
          <template #trigger>
            <UIButton
              v-radar="{ name: 'enter-full-screen-button', desc: 'Click to enter full screen for the running project' }"
              type="neutral"
              shape="square"
              icon="enterFullScreen"
              :disabled="handleStop.isLoading.value"
              @click="handleEnterFullscreen"
            ></UIButton>
          </template>
          {{ $t({ en: 'Enter full screen', zh: '进入全屏' }) }}
        </UITooltip>
      </template>
    </UICardHeader>

    <div v-if="rulerEnabled" class="flex flex-none items-start bg-grey-100 pt-3 pr-3 pl-3">
      <UITooltip placement="bottom-start">
        <template #trigger>
          <RulerToggle
            v-radar="{ name: 'ruler', desc: 'Toggle the ruler, which measures distance and angle on the stage' }"
            :active="rulerActive"
            :disabled="runnerState !== 'initial'"
            @click="rulerActive = !rulerActive"
          />
        </template>
        {{ $t(rulerTip) }}
      </UITooltip>
    </div>

    <div class="flex grow justify-center overflow-hidden p-3" :class="{ 'items-center': simpleMode }">
      <div
        ref="stageContainerRef"
        class="stage-viewer-container relative w-full overflow-hidden rounded-sm bg-grey-200"
        :class="{
          'stage-viewer-container-running': runnerState !== 'initial',
          'h-full': simpleMode
        }"
      >
        <StageViewer
          class="stage-viewer"
          :class="{ 'h-full aspect-auto': simpleMode }"
          :simple-mode="simpleMode"
          :ruler-active="rulerActive"
        />
        <div
          v-show="fullscreen || runnerState !== 'initial' || runnerHostSticky"
          class="runner-host absolute inset-0 flex items-center justify-center bg-grey-300"
        >
          <ProjectRunnerSurface
            ref="projectRunnerSurfaceRef"
            v-model:fullscreen="fullscreen"
            :track-execution-location="simpleMode"
            :project="editorCtx.project"
            :runner-state="runnerState"
            :on-run="handleRun.fn"
            :run-loading="handleRun.isLoading.value"
            :on-rerun="handleRerun.fn"
            :rerun-loading="handleRerun.isLoading.value"
            :on-stop="handleStop.fn"
            :stop-loading="handleStop.isLoading.value"
            :inline-anchor="getStageInlineAnchor"
            @console="handleConsole"
            @update:fullscreen="handleFullscreenChange"
            @exit="handleExit"
          />
        </div>
      </div>
    </div>
  </UICard>
  <Teleport v-if="simpleMode && controlsAnchor != null" :to="controlsAnchor">
    <button
      v-if="runnerState === 'initial'"
      v-radar="{ name: 'run-button', desc: 'Click to run the project in debug mode' }"
      class="cursor-pointer rounded-[16px] border-0 bg-grey-100 p-1.5 shadow-sm transition-[filter] duration-150 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-75"
      :disabled="handleRun.isLoading.value"
      type="button"
      @click="handleRun.fn"
    >
      <span
        class="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-turquoise-500 px-6 text-[15px] text-grey-100 font-medium leading-6"
      >
        <UIIcon class="h-5 w-5" :type="handleRun.isLoading.value ? 'loading' : 'playHollow'" />
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </span>
    </button>
    <button
      v-else
      v-radar="{ name: 'stop-button', desc: 'Click to stop the running project' }"
      class="cursor-pointer rounded-[16px] border-0 bg-grey-100 p-1.5 shadow-sm transition-[filter] duration-150 hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-75"
      :disabled="handleStop.isLoading.value"
      type="button"
      @click="handleStop.fn"
    >
      <span
        class="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-red-500 px-6 text-[15px] text-grey-100 font-medium leading-6"
      >
        <UIIcon class="h-5 w-5" :type="handleStop.isLoading.value ? 'loading' : 'end'" />
        {{ $t({ en: 'Stop', zh: '停止' }) }}
      </span>
    </button>
  </Teleport>
</template>

<script lang="ts">
// Check tools/ispx/log.go for log source
// TODO: Move these types & functions to ProjectRunner, and emit `log` instead of `console` event
type SpxLog = {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  /** RFC 3339 date time string, e.g., `2025-12-04T14:17:36.24+08:00` */
  time: string
  msg: string
  [key: string]: unknown
}

function isSpxLog(obj: any): obj is SpxLog {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof obj.level === 'string' &&
    typeof obj.time === 'string' &&
    typeof obj.msg === 'string'
  )
}

function parseSpxLog(jsonStr: string): SpxLog | null {
  try {
    const obj = JSON.parse(jsonStr)
    if (isSpxLog(obj)) return obj
  } catch {
    // ignore
  }
  return null
}

type SpxInfoLog = SpxLog & {
  level: 'INFO'
  function: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
}

function isSpxInfoLog(obj: SpxLog): obj is SpxInfoLog {
  return obj.level === 'INFO' && obj.msg !== '__spx_loc__'
}

type SpxPanicLog = SpxLog & {
  level: 'ERROR'
  msg: 'panic'
  /** Panic error message */
  error: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
  /** Source code column number, starting from 1 */
  column: number
}

function isSpxPanicLog(obj: SpxLog): obj is SpxPanicLog {
  return obj.level === 'ERROR' && typeof obj.error === 'string' && obj.msg === 'panic'
}
</script>

<script lang="ts" setup>
import dayjs from 'dayjs'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { withTimeout } from '@/utils/disposable'
import { Cancelled, capture, useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { humanizeListWithLimit, untilNotNull } from '@/utils/utils'
import { useSignedInUser } from '@/stores/user'
import { UICard, UICardHeader, UIButton, UIIcon, useConfirmDialog, UITooltip } from '@/components/ui'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import {
  useCodeEditor,
  DiagnosticSeverity,
  textDocumentId2CodeFileName,
  getInvalidMonitors
} from '@/components/editor/spx-code-editor'
import { RuntimeOutputKind, type RuntimeOutput, type RuntimeOutputDraft } from '@/components/editor/runtime'
import StageViewer from './stage-viewer/StageViewer.vue'
import RulerToggle from './stage-viewer/ruler/RulerToggle.vue'
import { isSpxLocationLog } from './spx-location'
import { useNetwork } from '@/utils/network'
import { usePublishProject } from '@/components/project'

const props = withDefaults(
  defineProps<{
    simpleMode?: boolean
    /** Where simple-mode Run/Stop controls are rendered beside the docked Copilot UI. */
    controlsAnchor?: HTMLElement | null
    rulerEnabled?: boolean
  }>(),
  {
    simpleMode: false,
    controlsAnchor: null,
    rulerEnabled: false
  }
)

const simpleMode = computed(() => props.simpleMode)

// Code Editor operations may take a long time for some projects and block project execution.
const CODE_EDITOR_OPERATION_TIMEOUT = 3_000 // ms

const editorCtx = useEditorCtx()
const codeEditor = useCodeEditor()
const { isOnline } = useNetwork()
const signedInUser = useSignedInUser()

const runtime = computed(() => editorCtx.state.runtime)
const runnerState = ref<'initial' | 'loading' | 'running'>('initial')
const rulerActive = ref(false)
const rulerTip = computed(() => {
  if (runnerState.value !== 'initial') return { en: 'Stop the run to measure', zh: '停止运行后才能测量' }
  return rulerActive.value
    ? { en: 'Put the ruler away', zh: '收起尺子' }
    : { en: 'Measure distance and angle', zh: '测量距离和角度' }
})

watch([() => props.rulerEnabled, runnerState], ([enabled, state]) => {
  if (!enabled || state !== 'initial') rulerActive.value = false
})

const projectRunnerSurfaceRef = ref<InstanceType<typeof ProjectRunnerSurface> | null>(null)
const stageContainerRef = ref<HTMLDivElement | null>(null)
const fullscreen = ref(false)
const exitGuard = ref<'idle' | 'manualStopPending'>('idle')
const runnerHostSticky = ref(false)
const lastFilesHash = ref<string | null>(null)
let runnerHostReleaseTimer: number | null = null

watch(
  () => [fullscreen.value, runnerState.value],
  ([isFullscreen, state]) => {
    if (isFullscreen || state !== 'initial') {
      runnerHostSticky.value = false
      if (runnerHostReleaseTimer != null) {
        window.clearTimeout(runnerHostReleaseTimer)
        runnerHostReleaseTimer = null
      }
    }
  }
)

const headerTitle = computed(() => {
  if (runnerState.value === 'loading') return { en: 'Loading', zh: '加载中' } satisfies LocaleMessage
  if (runnerState.value === 'running') return { en: 'Running', zh: '运行中' } satisfies LocaleMessage
  return { en: 'Preview', zh: '预览' } satisfies LocaleMessage
})

const i18n = useI18n()
const confirm = useConfirmDialog()

const lastPanicOutput = ref<RuntimeOutput | null>(null)

function appendRuntimeOutput(output: RuntimeOutputDraft) {
  runtime.value.addOutput(output)
}

function keepRunnerHostVisibleForOverlay() {
  runnerHostSticky.value = true
  if (runnerHostReleaseTimer != null) window.clearTimeout(runnerHostReleaseTimer)
  runnerHostReleaseTimer = window.setTimeout(() => {
    runnerHostSticky.value = false
    runnerHostReleaseTimer = null
  }, 450)
}

function handleConsole(type: 'log' | 'warn', args: unknown[]) {
  // Only handle spx logs, which are carried by `console.log`
  if (type !== 'log' || typeof args[0] !== 'string') return
  const spxLog = parseSpxLog(args[0])
  if (spxLog == null) return
  if (spxLog.msg === '__spx_loc__') {
    if (!isSpxLocationLog(spxLog)) return
    runtime.value.setCurrentLocation({
      textDocument: { uri: `file:///${spxLog.file}` },
      range: {
        start: { line: spxLog.line, column: 1 },
        end: { line: spxLog.line, column: 1 }
      }
    })
  } else if (isSpxInfoLog(spxLog)) {
    appendRuntimeOutput({
      kind: RuntimeOutputKind.Log,
      time: dayjs(spxLog.time).valueOf(),
      message: spxLog.msg,
      source: {
        textDocument: {
          uri: `file:///${spxLog.file}`
        },
        range: {
          start: { line: spxLog.line, column: 1 },
          end: { line: spxLog.line, column: 1 }
        }
      }
    })
  } else if (isSpxPanicLog(spxLog)) {
    appendRuntimeOutput({
      kind: RuntimeOutputKind.Error,
      time: dayjs(spxLog.time).valueOf(),
      message: spxLog.error,
      source: {
        textDocument: {
          uri: `file:///${spxLog.file}`
        },
        range: {
          start: { line: spxLog.line, column: spxLog.column },
          end: { line: spxLog.line, column: spxLog.column }
        }
      }
    })
  } else {
    capture(new Error(`Unknown spx runtime log: ${args[0]}`))
  }
}

function handleExit(code: number) {
  runtime.value.invalidateCurrentLocation()
  runtime.value.emit('didExit', code)
  if (exitGuard.value === 'manualStopPending') {
    exitGuard.value = 'idle'
    return
  }
  exitGuard.value = 'idle'
  lastPanicOutput.value = null
  const shouldRestore = restoreDebugRuntime()
  runnerState.value = shouldRestore ? 'running' : 'loading'
}

async function checkAndNotifyCodeError() {
  const r = await withTimeout(CODE_EDITOR_OPERATION_TIMEOUT, (signal) => codeEditor.diagnosticWorkspace(signal))
  const codeFilesWithError: LocaleMessage[] = []
  for (const item of r.items) {
    if (!item.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error)) continue
    codeFilesWithError.push(textDocumentId2CodeFileName(item.textDocument))
  }
  if (codeFilesWithError.length === 0) return
  const codeFileNamesWithError = humanizeListWithLimit(codeFilesWithError)
  await confirm({
    title: i18n.t({ en: 'Error exists in code', zh: '代码中存在错误' }),
    content: i18n.t({
      en: `There are stills errors in the project code (${codeFileNamesWithError.en}). The project may not run correctly. Are you sure to continue?`,
      zh: `当前项目代码（${codeFileNamesWithError.zh}文件）中存在错误，项目可能无法正常运行，确定继续吗？`
    })
  })
}

async function checkAndNotifyMonitorError() {
  const { sprites, stage } = editorCtx.project
  const monitors = stage.widgets.filter((w) => w.type === 'monitor')
  const spriteNames = new Set(sprites.map((s) => s.name))
  const invalidMonitors = await withTimeout(CODE_EDITOR_OPERATION_TIMEOUT, (signal) =>
    getInvalidMonitors(monitors, spriteNames, (target, s) => codeEditor.getProperties(target, s), signal)
  )
  if (invalidMonitors.length === 0) return
  const monitorNames = humanizeListWithLimit(invalidMonitors.map((m) => ({ en: m.name, zh: m.name })))
  await confirm({
    title: i18n.t({ en: 'Invalid monitor configuration', zh: '监视器配置无效' }),
    content: i18n.t({
      en: `Monitor ${monitorNames.en} has no valid variable configured and will not display correctly. Are you sure to continue?`,
      zh: `监视器 ${monitorNames.zh} 未配置有效的变量，运行时将无法正常显示，确定继续吗？`
    })
  })
}

async function checkAndNotifyPreRunErrors() {
  await checkAndNotifyCodeError()
  await checkAndNotifyMonitorError()
}

async function executeRun(action: 'run' | 'rerun') {
  exitGuard.value = 'idle'
  runnerState.value = 'loading'
  lastPanicOutput.value = null
  await nextTick()
  const surface = await untilNotNull(projectRunnerSurfaceRef)
  runtime.value.clearOutputs()
  editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: true })
  try {
    const filesHash = action === 'run' ? await surface.run() : await surface.rerun()
    runnerState.value = 'running'
    lastFilesHash.value = filesHash
    editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: false }, filesHash)
  } catch (error) {
    runnerState.value = 'running'
    editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: false, initializingError: error })
    throw error
  }
}

const canManageProject = computed(() => {
  if (editorCtx.project == null) return false
  const signedInUsername = signedInUser.value?.username
  if (signedInUsername == null) return false
  if (editorCtx.project.owner !== signedInUsername) return false
  return true
})
const publishProject = usePublishProject()
const handlePublishProject = useMessageHandle(() => publishProject(editorCtx.project), {
  en: 'Failed to publish project',
  zh: '发布项目失败'
}).fn

const handleRun = useMessageHandle(
  async () => {
    await checkAndNotifyPreRunErrors().catch((error) => {
      // Cancellation means the user declined to run; other check failures should not block project execution.
      if (error instanceof Cancelled) throw error
      capture(error, 'Failed to check project before running')
    })
    await executeRun('run')
  },
  { en: 'Failed to run project', zh: '运行项目失败' }
)

const handleRerun = useMessageHandle(
  async () => {
    await executeRun('rerun')
  },
  { en: 'Failed to rerun project', zh: '重新运行项目失败' }
)

const handleStop = useMessageHandle(
  async () => {
    const surface = projectRunnerSurfaceRef.value
    if (surface == null) return
    exitGuard.value = 'manualStopPending'
    try {
      await surface.stop()
      lastPanicOutput.value = null
      runnerState.value = 'initial'
      editorCtx.state.runtime.setRunning({ mode: 'none' })
    } catch (error) {
      exitGuard.value = 'idle'
      throw error
    }
  },
  { en: 'Failed to stop project', zh: '停止项目失败' }
)

function restoreDebugRuntime() {
  const filesHash = lastFilesHash.value ?? runtime.value.filesHash
  if (runnerState.value === 'loading' || filesHash == null) {
    editorCtx.state.runtime.setRunning({
      mode: 'debug',
      initializing: true
    })
    return false
  }
  editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: false }, filesHash)
  return true
}

function handleFullscreenChange(value: boolean) {
  fullscreen.value = value
  if (value) {
    if (runnerState.value !== 'initial') {
      editorCtx.state.runtime.setRunning({
        mode: 'debug',
        initializing: runnerState.value !== 'running'
      })
    }
    return
  }
  if (runnerState.value === 'initial') {
    keepRunnerHostVisibleForOverlay()
    editorCtx.state.runtime.setRunning({ mode: 'none' })
  } else {
    restoreDebugRuntime()
  }
}

function handleEnterFullscreen() {
  if (runnerState.value === 'initial') return
  handleFullscreenChange(true)
}

onBeforeUnmount(() => {
  if (runnerHostReleaseTimer != null) {
    window.clearTimeout(runnerHostReleaseTimer)
    runnerHostReleaseTimer = null
  }
})

function getStageInlineAnchor() {
  return stageContainerRef.value
}
</script>

<style scoped>
.stage-viewer-container-running .stage-viewer {
  filter: blur(4px);
  pointer-events: none;
  user-select: none;
}

.runner-host :deep(.project-runner-surface) {
  width: 100%;
  height: 100%;
  display: flex;
}

.runner-host :deep(.project-runner-surface:not(.fullscreen)) {
  align-items: center;
  justify-content: center;
}

.runner-host :deep(.project-runner-surface:not(.fullscreen) .runner-area) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.runner-host :deep(.project-runner-surface:not(.fullscreen) .runner) {
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
}
</style>
