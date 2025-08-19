<script setup lang="ts">
import { ref, shallowRef, watch, type CSSProperties } from 'vue'
import { timeout, untilNotNull } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { Project } from '@/models/project'
import { UIButton, UIModalClose } from '@/components/ui'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { useLastClickEvent } from '@/utils/dom'

const props = defineProps<{
  project: Project
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  exit: [code: number]
}>()

const wrapperRef = ref<HTMLDivElement>()
const projectRunnerRef = ref<InstanceType<typeof ProjectRunner>>()
const initialLoading = ref(false)

const lastClickEvent = useLastClickEvent()
const modalTransformStyle = shallowRef<CSSProperties | null>(null)
// Use the position of last click event as the transform origin of Modal, so that the modal appears from & disappears to the clicked position.
function updateModalTransformStyle() {
  modalTransformStyle.value =
    lastClickEvent.value == null ? null : { transformOrigin: `${lastClickEvent.value.x}px ${lastClickEvent.value.y}px` }
}

watch(
  () => props.visible,
  async (visible, _, onCleanup) => {
    if (!visible) return

    updateModalTransformStyle()
    initialLoading.value = true
    const projectRunner = await untilNotNull(projectRunnerRef)

    // Add timeout to ensure the scale transition is finished before running the project
    // Otherwise the loading animation will play with incorrect scale
    await timeout(400)

    projectRunner.run().finally(() => {
      initialLoading.value = false
    })

    onCleanup(() => {
      projectRunner.stop()
    })
  },
  { immediate: true }
)

const handleRerun = useMessageHandle(() => projectRunnerRef.value?.rerun(), {
  en: 'Failed to rerun project',
  zh: '重新运行项目失败'
})
</script>

<template>
  <!--
    A hidden div is used instead of `UIModal` to initialize the runner early, allowing for flexible preload logic in the runner component.
    Although naive-ui modal supports `display-directive: show`, it does not initialize the component until it is shown for the first time.
    TODO: Update `UIModal` to support this requirement.
  -->
  <div
    ref="wrapperRef"
    v-radar="{ name: 'Full screen project runner', desc: 'Full screen modal for running project', visible }"
    class="full-screen-project-runner"
    :class="{ visible }"
    :style="modalTransformStyle"
  >
    <div class="container">
      <div class="header">
        <div class="header-left"></div>
        <div class="project-name">
          {{ project.name }}
        </div>
        <div class="header-right">
          <UIButton
            v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in full screen' }"
            class="button"
            icon="rotate"
            :disabled="initialLoading"
            :loading="handleRerun.isLoading.value"
            @click="handleRerun.fn"
          >
            {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
          </UIButton>
          <!-- TODO: support "stop", which preserves the last frame -->
          <UIModalClose
            v-radar="{ name: 'Close full screen', desc: 'Click to close full screen project runner' }"
            class="close"
            @click="emit('close')"
          />
        </div>
      </div>
      <div class="main">
        <ProjectRunner ref="projectRunnerRef" class="runner" :project="project" @exit="(code) => emit('exit', code)" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.full-screen-project-runner {
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
    transform 0.4s ease-in-out,
    opacity 0.2s ease-in-out 0.1s;

  &.visible {
    display: block;
    transform: scale(1);
    opacity: 1;
  }
}

.close {
  transform: scale(1.2);
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 32px;
  font-size: 16px;
  border-bottom: 1px solid var(--ui-color-grey-400);
  height: 56px;
  color: var(--ui-color-title);
}

.header-left {
  flex: 1;
  flex-basis: 30%;
}

.project-name {
  flex: 1;
  flex-basis: 40%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  flex: 1;
  flex-basis: 30%;
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  align-items: center;
  padding-right: 20px;
}

.main {
  padding: 20px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  // Now runner is centered in X axis, while stretched in Y axis.
  // TODO: It will be ideal to stretch and center the runner in both axes and maintain its aspect ratio.
  display: flex;
  justify-content: center;
  background-color: var(--ui-color-grey-300);
}

.runner {
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>
