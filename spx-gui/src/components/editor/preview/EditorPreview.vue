<template>
  <UICard class="editor-preview">
    <UICardHeader v-if="running !== 'debug'">
      <div class="header">
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </div>
      <UIButton
        ref="runButtonRef"
        class="button"
        type="primary"
        icon="play"
        :loading="startDebugging.isLoading.value"
        @click="startDebugging.fn"
      >
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
      <UIButton
        ref="fullScreenRunButtonRef"
        class="button"
        type="primary"
        icon="play"
        :loading="startRunning.isLoading.value"
        @click="startRunning.fn"
      >
        {{ $t({ en: 'Full screen', zh: '全屏' }) }}
      </UIButton>
    </UICardHeader>
    <UICardHeader v-else>
      <div class="header">
        {{ $t({ en: 'Running', zh: '运行中' }) }}
      </div>
      <UIButton class="button" type="primary" icon="stop" @click="setRunning('none')">
        {{ $t({ en: 'Stop', zh: '停止' }) }}
      </UIButton>
    </UICardHeader>

    <!--
      A hidden div is used instead of `UIModal` to initialize the runner early, allowing for flexible preload logic in the runner component.
      Although naive-ui modal supports `display-directive: show`, it does not initialize the component until it is shown for the first time.
      TODO: Update `UIModal` to support this requirement.
    -->
    <div class="full-screen-runner-modal" :class="{ visible: running === 'run' }" :style="modalStyle">
      <RunnerContainer :project="editorCtx.project" :visible="running === 'run'" @close="setRunning('none')" />
    </div>

    <div class="main">
      <div class="stage-viewer-container">
        <StageViewer />
        <div v-show="running === 'debug'" class="in-place-runner">
          <InPlaceRunner :project="editorCtx.project" :visible="running === 'debug'" />
        </div>
      </div>
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useAction, useMessageHandle } from '@/utils/exception'
import type { RunningMode } from '@/models/runtime'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'
import { UICard, UICardHeader, UIButton } from '@/components/ui'
import StageViewer from './stage-viewer/StageViewer.vue'
import RunnerContainer from './RunnerContainer.vue'
import InPlaceRunner from './InPlaceRunner.vue'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

const running = computed(() => editorCtx.runtime.running)

function setRunning(running: RunningMode) {
  editorCtx.runtime.setRunning(running)
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
  setRunning('run')
})

const startDebugging = useMessageHandle(async () => {
  await formatWorkspace()
  setRunning('debug')
})

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
