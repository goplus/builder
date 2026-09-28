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
            @output="handleOutput"
            @location="handleLocation"
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

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { withTimeout } from '@/utils/disposable'
import { Cancelled, capture, useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { humanizeListWithLimit, untilNotNull } from '@/utils/utils'
import { useSignedInUser } from '@/stores/user'
import { UICard, UICardHeader, UIButton, UIIcon, useConfirmDialog, UITooltip } from '@/components/ui'
import { usePublishProject } from '@/components/project'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import type { ProjectRunnerLocation, ProjectRunnerOutput } from '@/components/project/runner/types'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import {
  useCodeEditor,
  DiagnosticSeverity,
  textDocumentId2CodeFileName,
  getInvalidMonitors
} from '@/components/editor/spx-code-editor'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import StageViewer from './stage-viewer/StageViewer.vue'
import RulerToggle from './stage-viewer/ruler/RulerToggle.vue'

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

function keepRunnerHostVisibleForOverlay() {
  runnerHostSticky.value = true
  if (runnerHostReleaseTimer != null) window.clearTimeout(runnerHostReleaseTimer)
  runnerHostReleaseTimer = window.setTimeout(() => {
    runnerHostSticky.value = false
    runnerHostReleaseTimer = null
  }, 450)
}

function handleOutput(output: ProjectRunnerOutput) {
  runtime.value.addOutput({
    kind: output.kind === 'log' ? RuntimeOutputKind.Log : RuntimeOutputKind.Error,
    time: output.time,
    message: output.message,
    source: output.source
  })
}

function handleLocation(location: ProjectRunnerLocation) {
  runtime.value.setLocation(location)
}

function handleExit(code: number) {
  runtime.value.invalidateLocation()
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
