<template>
  <UICard class="editor-preview">
    <UICardHeader v-if="running.mode !== 'debug'">
      <div class="header">
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </div>
      <UIButton
        ref="runButtonRef"
        class="button"
        type="primary"
        icon="playHollow"
        :loading="startDebugging.isLoading.value"
        @click="startDebugging.fn"
      >
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
      <UIButton
        ref="fullScreenRunButtonRef"
        class="button full-screen-run-button"
        type="boring"
        :loading="startRunning.isLoading.value"
        @click="startRunning.fn"
      >
        <template #icon>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8.61229 7.50624L6.59284 9.20967C6.25334 9.49609 5.73593 9.25286 5.73593 8.80778V5.19214C5.73593 4.74647 6.25276 4.50382 6.59284 4.79024L8.61229 6.49367C8.92554 6.75792 8.92554 7.24199 8.61229 7.50624Z"
              fill="#57606A"
            />
            <path
              d="M4.99991 2.3501H2.55001C2.43955 2.3501 2.35001 2.43964 2.35001 2.5501V5"
              stroke="#57606A"
              stroke-width="1.4"
            />
            <path
              d="M9.00009 2.3501H11.45C11.5605 2.3501 11.65 2.43964 11.65 2.5501V5"
              stroke="#57606A"
              stroke-width="1.4"
            />
            <path
              d="M4.99991 11.6499H2.55001C2.43955 11.6499 2.35001 11.5604 2.35001 11.4499V9"
              stroke="#57606A"
              stroke-width="1.4"
            />
            <path
              d="M9.00009 11.6499H11.45C11.5605 11.6499 11.65 11.5604 11.65 11.4499V9"
              stroke="#57606A"
              stroke-width="1.4"
            />
          </svg>
        </template>
      </UIButton>
    </UICardHeader>
    <UICardHeader v-else>
      <div class="header">
        {{ $t({ en: 'Running', zh: '运行中' }) }}
      </div>
      <UIButton
        class="button"
        type="primary"
        icon="rotate"
        :disabled="running.initializing"
        @click="handleInPlaceRerun"
      >
        {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
      </UIButton>
      <UIButton class="button" type="boring" :disabled="running.initializing" @click="handleStop">
        {{ $t({ en: 'Stop', zh: '停止' }) }}
      </UIButton>
    </UICardHeader>

    <!--
      A hidden div is used instead of `UIModal` to initialize the runner early, allowing for flexible preload logic in the runner component.
      Although naive-ui modal supports `display-directive: show`, it does not initialize the component until it is shown for the first time.
      TODO: Update `UIModal` to support this requirement.
    -->
    <div class="full-screen-runner-modal" :class="{ visible: running.mode === 'run' }" :style="modalStyle">
      <RunnerContainer :project="editorCtx.project" :visible="running.mode === 'run'" @close="handleStop" />
    </div>

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
import { useAction, useMessageHandle } from '@/utils/exception'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'
import { UICard, UICardHeader, UIButton } from '@/components/ui'
import StageViewer from './stage-viewer/StageViewer.vue'
import RunnerContainer from './RunnerContainer.vue'
import InPlaceRunner from './InPlaceRunner.vue'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

const running = computed(() => editorCtx.runtime.running)

function handleStop() {
  editorCtx.runtime.setRunning({ mode: 'none' })
}

const formatWorkspace = useAction(
  () =>
    editorCtx.project.history.doAction({ name: { en: 'Format code', zh: '格式化代码' } }, () =>
      codeEditorCtx.formatWorkspace()
    ),
  {
    en: 'Failed to format code',
    zh: '格式化代码失败'
  }
)

const startRunning = useMessageHandle(async () => {
  await formatWorkspace()
  editorCtx.runtime.setRunning({ mode: 'run' })
})

const startDebugging = useMessageHandle(async () => {
  await formatWorkspace()
  editorCtx.runtime.setRunning({ mode: 'debug', initializing: true })
})

const inPlaceRunner = ref<InstanceType<typeof InPlaceRunner>>()

function handleInPlaceRerun() {
  inPlaceRunner.value?.rerun()
}

const fullScreenRunButtonRef = ref<InstanceType<typeof UIButton>>()
const modalStyle = computed(() => {
  if (!fullScreenRunButtonRef.value) return null
  const { top, left, width, height } = fullScreenRunButtonRef.value.$el.getBoundingClientRect()
  return { transformOrigin: `${left + width / 2}px ${top + height / 2}px` }
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

.full-screen-runner-modal {
  position: fixed;
  z-index: 100;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: white;
  transform: scale(0);
  opacity: 0;
  transition:
    transform 0.5s ease-in-out,
    opacity 0.2s ease-in-out 0.2s;

  &.visible {
    display: block;
    transform: scale(1);
    opacity: 1;
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
