<template>
  <UICard
    v-radar="{ name: 'Editor preview', desc: 'Preview panel for stage preview and project running' }"
    class="editor-preview"
  >
    <UICardHeader>
      <div class="header">
        {{ $t(headerTitle) }}
      </div>
      <template v-if="runnerState === 'initial'">
        <UIButton
          v-radar="{ name: 'Run button', desc: 'Click to run the project in debug mode' }"
          class="button"
          color="primary"
          icon="playHollow"
          :loading="handleRun.isLoading.value"
          @click="handleRun.fn"
        >
          {{ $t({ en: 'Run', zh: '运行' }) }}
        </UIButton>

        <UIButton
          v-show="canManageProject"
          v-radar="{ name: 'Publish button', desc: 'Click to publish the project' }"
          color="secondary"
          :disabled="!isOnline"
          @click="handlePublishProject"
        >
          <img :src="publishSvg" style="width: 14px" />
          {{ $t({ en: 'Publish', zh: '发布' }) }}
        </UIButton>
      </template>
      <template v-else>
        <UIButton
          v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project' }"
          class="button"
          color="primary"
          icon="rotate"
          :disabled="runnerState !== 'running' || handleStop.isLoading.value"
          :loading="handleRerun.isLoading.value && !handleStop.isLoading.value"
          @click="handleRerun.fn"
        >
          {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Stop button', desc: 'Click to stop the running project' }"
          class="button"
          color="boring"
          icon="end"
          :loading="handleStop.isLoading.value"
          @click="handleStop.fn"
        >
          {{ $t({ en: 'Stop', zh: '停止' }) }}
        </UIButton>
        <UITooltip placement="top-end">
          <template #trigger>
            <UIButton
              v-radar="{ name: 'Enter full screen button', desc: 'Click to enter full screen for the running project' }"
              class="button"
              color="boring"
              icon="enterFullScreen"
              :disabled="handleStop.isLoading.value"
              @click="handleEnterFullscreen"
            ></UIButton>
          </template>
          {{ $t({ en: 'Enter full screen', zh: '进入全屏' }) }}
        </UITooltip>
      </template>
    </UICardHeader>

    <div class="main">
      <div
        ref="stageContainerRef"
        class="stage-viewer-container"
        :class="{ 'stage-viewer-container--running': runnerState !== 'initial' }"
      >
        <StageViewer />
        <div v-show="fullscreen || runnerState !== 'initial' || runnerHostSticky" class="runner-host">
          <ProjectRunnerSurface
            ref="projectRunnerSurfaceRef"
            v-model:fullscreen="fullscreen"
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
</template>

<script lang="ts">
// Check https://github.com/goplus/spx/blob/dev/cmd/igox/main.go for log source
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
  return obj.level === 'INFO'
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
import { capture, useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { humanizeListWithLimit, untilNotNull } from '@/utils/utils'
import { UICard, UICardHeader, UIButton, useConfirmDialog, UITooltip } from '@/components/ui'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import { DiagnosticSeverity, textDocumentId2CodeFileName } from '../code-editor/common'
import StageViewer from './stage-viewer/StageViewer.vue'
import { useNetwork } from '@/utils/network'
import { usePublishProject } from '@/components/project'
import publishSvg from './publish.svg'
import { getSignedInUsername } from '@/stores/user'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()
const { isOnline } = useNetwork()

const runtime = computed(() => editorCtx.state.runtime)
const runnerState = ref<'initial' | 'loading' | 'running'>('initial')

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

function appendRuntimeOutput(output: RuntimeOutput) {
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
  if (isSpxInfoLog(spxLog)) {
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

async function checkAndNotifyError() {
  const r = await codeEditorCtx.mustEditor().diagnosticWorkspace()
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
    if (filesHash != null) lastFilesHash.value = filesHash
    const nextHash = filesHash ?? lastFilesHash.value
    if (nextHash != null) editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: false }, nextHash)
    else editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: true })
  } catch (error) {
    runnerState.value = 'initial'
    editorCtx.state.runtime.setRunning({ mode: 'none' })
    throw error
  }
}

const canManageProject = computed(() => {
  if (editorCtx.project == null) return false
  const signedInUsername = getSignedInUsername()
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
    await checkAndNotifyError()
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

<style scoped lang="scss">
.editor-preview {
  height: 419px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .header {
    flex: 1;
    color: var(--ui-color-title);
  }

  .button {
    margin: 0 8px;
  }

  .main {
    display: flex;
    overflow: hidden;
    justify-content: center;
    padding: 12px;
    height: 100%;
  }

  .stage-viewer-container {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: var(--ui-border-radius-1);
    overflow: hidden;
    background-color: var(--ui-color-grey-200);

    &--running {
      :deep(.stage-viewer) {
        filter: blur(4px);
        pointer-events: none;
        user-select: none;
      }
    }

    .runner-host {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--ui-color-grey-300);

      :deep(.project-runner-surface) {
        width: 100%;
        height: 100%;
        display: flex;
      }

      :deep(.project-runner-surface:not(.fullscreen)) {
        align-items: center;
        justify-content: center;
      }

      :deep(.project-runner-surface:not(.fullscreen) .runner) {
        width: 100%;
        max-width: 100%;
        max-height: 100%;
        aspect-ratio: 4 / 3;
        height: auto;
      }
    }
  }
}
</style>
