<template>
  <UICard
    v-radar="{ name: 'Editor preview', desc: 'Preview panel for stage preview and project running' }"
    class="editor-preview"
  >
    <UICardHeader v-if="running.mode !== 'debug'">
      <div class="header">
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </div>
      <UIButton
        ref="runButtonRef"
        v-radar="{ name: 'Run button', desc: 'Click to run the project in debug mode' }"
        class="button"
        type="primary"
        icon="playHollow"
        :loading="startDebugging.isLoading.value"
        @click="startDebugging.fn"
      >
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
      <UITooltip placement="top-end">
        <template #trigger>
          <UIButton
            v-radar="{ name: 'Full screen run button', desc: 'Click to run in full screen mode' }"
            class="button full-screen-run-button"
            type="boring"
            icon="fullScreen"
            :loading="startRunning.isLoading.value"
            @click="startRunning.fn"
          ></UIButton>
        </template>
        {{ $t({ en: 'Run in full screen', zh: '全屏运行' }) }}
      </UITooltip>
    </UICardHeader>
    <UICardHeader v-else>
      <div class="header">
        {{ $t({ en: 'Running', zh: '运行中' }) }}
      </div>
      <UIButton
        v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project' }"
        class="button"
        type="primary"
        icon="rotate"
        :disabled="running.initializing"
        :loading="handleInPlaceRerun.isLoading.value"
        @click="handleInPlaceRerun.fn"
      >
        {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Stop button', desc: 'Click to stop the running project' }"
        class="button"
        type="boring"
        icon="end"
        @click="handleStop"
      >
        {{ $t({ en: 'Stop', zh: '停止' }) }}
      </UIButton>
    </UICardHeader>

    <FullScreenProjectRunner
      :project="editorCtx.project"
      :visible="running.mode === 'run'"
      @close="handleStop"
      @exit="handleExit"
    />

    <div class="main">
      <div class="stage-viewer-container">
        <StageViewer />
        <div v-show="running.mode === 'debug'" class="in-place-runner">
          <InPlaceRunner ref="inPlaceRunner" :project="editorCtx.project" :visible="running.mode === 'debug'" />
        </div>
      </div>
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { humanizeListWithLimit } from '@/utils/utils'
import { UICard, UICardHeader, UIButton, useConfirmDialog, UITooltip } from '@/components/ui'
import FullScreenProjectRunner from '@/components/project/runner/FullScreenProjectRunner.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'
import { DiagnosticSeverity, textDocumentId2CodeFileName } from '../code-editor/common'
import StageViewer from './stage-viewer/StageViewer.vue'
import InPlaceRunner from './InPlaceRunner.vue'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

const running = computed(() => editorCtx.state.runtime.running)

function handleStop() {
  editorCtx.state.runtime.setRunning({ mode: 'none' })
}

function handleExit(code: number) {
  editorCtx.state.runtime.emit('didExit', code)
}

const i18n = useI18n()
const confirm = useConfirmDialog()

async function checkAndNotifyError() {
  const r = await codeEditorCtx.mustEditor().diagnosticWorkspace()
  const codeFilesWithError: LocaleMessage[] = []
  for (const i of r.items) {
    if (!i.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error)) continue
    codeFilesWithError.push(textDocumentId2CodeFileName(i.textDocument))
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
  } catch (e) {
    console.warn('Failed to format workspace', e)
  }
}

const startRunning = useMessageHandle(async () => {
  await checkAndNotifyError()
  await tryFormatWorkspace()
  editorCtx.state.runtime.setRunning({ mode: 'run' })
})

const startDebugging = useMessageHandle(async () => {
  await checkAndNotifyError()
  await tryFormatWorkspace()
  editorCtx.state.runtime.setRunning({ mode: 'debug', initializing: true })
})

const inPlaceRunner = ref<InstanceType<typeof InPlaceRunner>>()

const handleInPlaceRerun = useMessageHandle(() => inPlaceRunner.value?.rerun(), {
  en: 'Failed to rerun project',
  zh: '重新运行项目失败'
})
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

  .full-screen-run-button :deep(.content) {
    padding: 0 9px;
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
  }
}

.in-place-runner {
  position: absolute;
  z-index: 10;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}
</style>
