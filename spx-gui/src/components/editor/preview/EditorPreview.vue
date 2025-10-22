<template>
  <UICard
    v-radar="{ name: 'Editor preview', desc: 'Preview panel for stage preview and project running' }"
    class="editor-preview"
  >
    <UICardHeader>
      <div class="header">
        {{ $t(headerTitle) }}
      </div>
      <UIButton
        v-if="runnerState === 'initial'"
        v-radar="{ name: 'Run button', desc: 'Click to run the project in debug mode' }"
        class="button"
        type="primary"
        icon="playHollow"
        :loading="handleRun.isLoading.value"
        @click="handleRun.fn"
      >
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
      <template v-else>
        <UIButton
          v-if="runnerState === 'running' && !handleStop.isLoading.value"
          v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project' }"
          class="button"
          type="primary"
          icon="rotate"
          :loading="handleRerun.isLoading.value"
          @click="handleRerun.fn"
        >
          {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Stop button', desc: 'Click to stop the running project' }"
          class="button"
          type="boring"
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
              type="boring"
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
        <UITooltip v-if="runnerState === 'initial'">
          <template #trigger>
            <button
              v-radar="{ name: 'Full map button', desc: 'Click to view & edit the full map' }"
              class="edit-map-button"
              @click="handleEditMap"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4.99988 2.34961H2.54998C2.43952 2.34961 2.34998 2.43915 2.34998 2.54961V4.99951"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
                <path
                  d="M9.00012 2.34961H11.45C11.5605 2.34961 11.65 2.43915 11.65 2.54961V4.99951"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
                <path
                  d="M4.99988 11.6504H2.54998C2.43952 11.6504 2.34998 11.5608 2.34998 11.4504V9.00049"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
                <path
                  d="M9.00012 11.6504H11.45C11.5605 11.6504 11.65 11.5608 11.65 11.4504V9.00049"
                  stroke="currentColor"
                  stroke-width="1.4"
                />
              </svg>
            </button>
          </template>
          {{ $t({ en: 'View full map', zh: '查看完整地图' }) }}
        </UITooltip>
      </div>
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { humanizeListWithLimit, untilNotNull } from '@/utils/utils'
import { UICard, UICardHeader, UIButton, useConfirmDialog, UITooltip, useModal } from '@/components/ui'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'
import MapEditorModal from '@/components/editor/map-editor/MapEditorModal.vue'
import { RuntimeOutputKind, type RuntimeOutput } from '@/components/editor/runtime'
import { DiagnosticSeverity, textDocumentId2CodeFileName } from '../code-editor/common'
import StageViewer from './stage-viewer/StageViewer.vue'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

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
  if (type === 'log' && args.length === 1 && typeof args[0] === 'string') {
    try {
      const logMsg = JSON.parse(args[0])
      if (logMsg.level === 'INFO') {
        appendRuntimeOutput({
          kind: RuntimeOutputKind.Log,
          time: logMsg.time,
          message: logMsg.msg,
          source: {
            textDocument: {
              uri: `file:///${logMsg.file}`
            },
            range: {
              start: { line: logMsg.line, column: 1 },
              end: { line: logMsg.line, column: 1 }
            }
          }
        })
        return
      }
      if (logMsg.level === 'ERROR' && logMsg.error && logMsg.msg === 'panic') {
        lastPanicOutput.value = {
          kind: RuntimeOutputKind.Error,
          time: logMsg.time,
          message: `panic: ${logMsg.error}`,
          source: {
            textDocument: {
              uri: `file:///${logMsg.file}`
            },
            range: {
              start: { line: logMsg.line, column: logMsg.column },
              end: { line: logMsg.line, column: logMsg.column }
            }
          }
        }
        return
      }
    } catch {
      // fall through to default handling
    }
  }

  const message = args.join(' ')
  if (/^panic: .+ \[recovered\]$/.test(message)) return

  if (
    type === 'log' &&
    lastPanicOutput.value != null &&
    (message === lastPanicOutput.value.message || message === '\t' + lastPanicOutput.value.message)
  ) {
    appendRuntimeOutput(lastPanicOutput.value)
    lastPanicOutput.value = null
  } else {
    appendRuntimeOutput({
      kind: type === 'warn' ? RuntimeOutputKind.Error : RuntimeOutputKind.Log,
      time: Date.now(),
      message
    })
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

async function tryFormatWorkspace() {
  try {
    await editorCtx.project.history.doAction({ name: { en: 'Format code', zh: '格式化代码' } }, () =>
      codeEditorCtx.mustEditor().formatWorkspace()
    )
  } catch (error) {
    console.warn('Failed to format workspace', error)
  }
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

const handleRun = useMessageHandle(
  async () => {
    await checkAndNotifyError()
    await tryFormatWorkspace()
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

const invokeMapEditor = useModal(MapEditorModal)
const handleEditMap = useMessageHandle(() =>
  invokeMapEditor({
    project: editorCtx.project,
    selectedSpriteId: editorCtx.state.selectedSprite?.id ?? null
  })
).fn

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
    margin-left: 8px;
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

    .edit-map-button {
      position: absolute;
      bottom: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      z-index: 5;
      border: none;
      border-radius: 12px;
      color: var(--ui-color-hint-1);
      background-color: var(--ui-color-grey-100);
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: var(--ui-color-text);
        box-shadow: var(--ui-box-shadow-small);
      }
    }
  }
}
</style>
