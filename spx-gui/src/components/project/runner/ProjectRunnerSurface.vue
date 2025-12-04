<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { timeout, untilNotNull } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { Project } from '@/models/project'
import { UIButton, UITooltip } from '@/components/ui'
import ProjectRunner from './ProjectRunner.vue'

type RunnerState = 'initial' | 'loading' | 'running'

const props = withDefaults(
  defineProps<{
    project: Project
    fullscreen?: boolean
    inlineAnchor?: () => HTMLElement | null
    onRun?: () => void | Promise<void>
    runLoading?: boolean
    onRerun?: () => void | Promise<void>
    rerunLoading?: boolean
    onStop?: () => void | Promise<void>
    stopLoading?: boolean
    runnerState?: RunnerState
  }>(),
  {
    fullscreen: false,
    inlineAnchor: undefined,
    onRun: undefined,
    runLoading: false,
    onRerun: undefined,
    rerunLoading: false,
    onStop: undefined,
    stopLoading: false,
    runnerState: 'running' as RunnerState
  }
)

const emit = defineEmits<{
  'update:fullscreen': [value: boolean]
  exit: [code: number]
  console: [type: 'log' | 'warn', args: unknown[]]
}>()

const runnerRef = ref<InstanceType<typeof ProjectRunner>>()
const rootRef = ref<HTMLDivElement>()
const wrapperRef = ref<HTMLDivElement>()
const overlayActive = ref(false)
const overlayVisible = ref(false)
const initialLoading = ref(false)
const overlayTransitionSuspended = ref(false)
const overlayClosing = ref(false)
const overlayOpening = ref(false)
const overlayCollapsedScaleX = ref(0.6)
const overlayCollapsedScaleY = ref(0.6)
const overlayCollapsedTranslateX = ref(0)
const overlayCollapsedTranslateY = ref(0)
const overlayTransitionDuration = 400
type InlineMetrics = {
  translateX: number
  translateY: number
  scaleX: number
  scaleY: number
  width: number
  height: number
}
const inlineMetrics = shallowRef<InlineMetrics | null>(null)

type OverlayTransform = {
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
}

const overlayTransform = computed<OverlayTransform>(() => {
  if (!overlayActive.value) {
    return {
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0
    }
  }

  const suspended = overlayTransitionSuspended.value
  const visible = overlayVisible.value
  const collapsed = {
    scaleX: overlayCollapsedScaleX.value,
    scaleY: overlayCollapsedScaleY.value,
    translateX: overlayCollapsedTranslateX.value,
    translateY: overlayCollapsedTranslateY.value
  }

  if (suspended || !visible) return collapsed

  return {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
  }
})

let overlayTransitionToken = 0

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    resolve()
  })
}

function clampScale(value: number) {
  if (!Number.isFinite(value)) return 0.01
  if (value <= 0) return 0.01
  if (value > 10) return 10
  return value
}

function getInlineRect() {
  const anchor = props.inlineAnchor?.()
  if (anchor != null) {
    const rect = anchor.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return rect
  }

  if (!overlayActive.value) {
    const runnerEl = (runnerRef.value?.$el as HTMLElement | undefined) ?? null
    if (runnerEl != null) {
      const rect = runnerEl.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return rect
    }

    const wrapper = wrapperRef.value
    if (wrapper != null) {
      const rect = wrapper.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return rect
    }

    const root = rootRef.value
    if (root != null) {
      const rect = root.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return rect
    }
  }

  const root = rootRef.value
  if (root != null) {
    const rect = root.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return rect
  }

  return null
}

function computeInlineMetrics(rect: DOMRect): InlineMetrics {
  const viewportWidth =
    typeof window !== 'undefined'
      ? window.innerWidth || document?.documentElement?.clientWidth || rect.width
      : rect.width
  const viewportHeight =
    typeof window !== 'undefined'
      ? window.innerHeight || document?.documentElement?.clientHeight || rect.height
      : rect.height

  const scaleX = clampScale(rect.width / Math.max(viewportWidth, 1))
  const scaleY = clampScale(rect.height / Math.max(viewportHeight, 1))
  const translateX = rect.left
  const translateY = rect.top

  return {
    translateX,
    translateY,
    scaleX,
    scaleY,
    width: rect.width,
    height: rect.height
  }
}

function applyInlineMetrics(metrics: InlineMetrics | null) {
  if (metrics == null) {
    if (inlineMetrics.value == null) {
      overlayCollapsedScaleX.value = 0.6
      overlayCollapsedScaleY.value = 0.6
      overlayCollapsedTranslateX.value = 0
      overlayCollapsedTranslateY.value = 0
    }
    return
  }

  overlayCollapsedScaleX.value = metrics.scaleX
  overlayCollapsedScaleY.value = metrics.scaleY
  overlayCollapsedTranslateX.value = metrics.translateX
  overlayCollapsedTranslateY.value = metrics.translateY
}

function captureInlineMetrics() {
  const rect = getInlineRect()
  if (rect == null) {
    inlineMetrics.value = null
    applyInlineMetrics(null)
    return null
  }
  const metrics = computeInlineMetrics(rect)
  inlineMetrics.value = metrics
  applyInlineMetrics(metrics)
  return metrics
}

function ensureOverlayMetrics() {
  captureInlineMetrics()
}

function updateOverlayTransformTargets() {
  const metrics = inlineMetrics.value
  if (metrics == null) return

  const runnerEl = (runnerRef.value?.$el as HTMLElement | undefined) ?? null
  const wrapper = wrapperRef.value
  if (runnerEl == null || wrapper == null) return

  const runnerRect = runnerEl.getBoundingClientRect()
  const wrapperRect = wrapper.getBoundingClientRect()
  if (runnerRect.width <= 0 || runnerRect.height <= 0 || wrapperRect.width <= 0 || wrapperRect.height <= 0) return

  const transform = overlayTransform.value
  const currentScaleX = Number.isFinite(transform.scaleX) && transform.scaleX > 0 ? transform.scaleX : 1
  const currentScaleY = Number.isFinite(transform.scaleY) && transform.scaleY > 0 ? transform.scaleY : 1

  const rawOffsetX = runnerRect.left - wrapperRect.left
  const rawOffsetY = runnerRect.top - wrapperRect.top
  const offsetX = rawOffsetX / currentScaleX
  const offsetY = rawOffsetY / currentScaleY

  const runnerWidth = runnerRect.width / currentScaleX
  const runnerHeight = runnerRect.height / currentScaleY

  const targetWidth = Math.max(metrics.width, 1)
  const targetHeight = Math.max(metrics.height, 1)

  const nextScaleX = clampScale(targetWidth / Math.max(runnerWidth, 1))
  const nextScaleY = clampScale(targetHeight / Math.max(runnerHeight, 1))

  overlayCollapsedScaleX.value = nextScaleX
  overlayCollapsedScaleY.value = nextScaleY
  overlayCollapsedTranslateX.value = metrics.translateX - nextScaleX * offsetX
  overlayCollapsedTranslateY.value = metrics.translateY - nextScaleY * offsetY
}

async function openOverlay() {
  const token = ++overlayTransitionToken

  overlayClosing.value = false
  overlayOpening.value = true
  ensureOverlayMetrics()
  overlayTransitionSuspended.value = true
  overlayActive.value = true
  overlayVisible.value = false
  initialLoading.value = true

  await nextTick()
  if (token !== overlayTransitionToken) return

  updateOverlayTransformTargets()
  void wrapperRef.value?.getBoundingClientRect()
  overlayTransitionSuspended.value = false
  await waitForAnimationFrame()
  if (token !== overlayTransitionToken) return
  await waitForAnimationFrame()
  if (token !== overlayTransitionToken) return

  overlayVisible.value = true

  await timeout(overlayTransitionDuration)
  if (token !== overlayTransitionToken) return

  overlayOpening.value = false
  initialLoading.value = false
}

async function closeOverlay() {
  overlayTransitionSuspended.value = false
  ensureOverlayMetrics()
  if (!overlayActive.value && !overlayVisible.value) {
    overlayClosing.value = false
    overlayOpening.value = false
    initialLoading.value = false
    captureInlineMetrics()
    return
  }

  const token = ++overlayTransitionToken

  overlayClosing.value = true
  overlayOpening.value = false
  updateOverlayTransformTargets()
  overlayVisible.value = false

  await timeout(overlayTransitionDuration)
  if (token !== overlayTransitionToken) return

  overlayTransitionSuspended.value = true
  overlayActive.value = false
  overlayClosing.value = false
  overlayOpening.value = false
  initialLoading.value = false
  await nextTick()
  captureInlineMetrics()
  await waitForAnimationFrame()
  overlayTransitionSuspended.value = false
}

watch(
  () => props.fullscreen,
  (value) => {
    if (value) void openOverlay()
    else void closeOverlay()
  },
  { immediate: true }
)

onMounted(() => {
  void nextTick().then(() => captureInlineMetrics())
})

const runnerState = computed<RunnerState>(() => props.runnerState ?? 'running')

const handleInternalRun = useMessageHandle(() => runnerRef.value?.run(), {
  en: 'Failed to run project',
  zh: '运行项目失败'
})

const handleInternalRerun = useMessageHandle(() => runnerRef.value?.rerun(), {
  en: 'Failed to rerun project',
  zh: '重新运行项目失败'
})

const handleInternalStop = useMessageHandle(() => runnerRef.value?.stop(), {
  en: 'Failed to stop project',
  zh: '停止项目失败'
})

const runHandler = computed(() => props.onRun ?? handleInternalRun.fn)
const runButtonLoading = computed(() => (props.onRun != null ? props.runLoading : handleInternalRun.isLoading.value))

const rerunHandler = computed(() => props.onRerun ?? handleInternalRerun.fn)
const rerunButtonLoading = computed(() =>
  props.onRerun != null ? props.rerunLoading : handleInternalRerun.isLoading.value
)

const stopHandler = computed(() => props.onStop ?? handleInternalStop.fn)
const stopButtonLoading = computed(() =>
  props.onStop != null ? props.stopLoading : handleInternalStop.isLoading.value
)

function handleRunClick() {
  const fn = runHandler.value
  if (fn == null) return
  return fn()
}

function handleRerunClick() {
  const fn = rerunHandler.value
  if (fn == null) return
  return fn()
}

function handleStopClick() {
  const fn = stopHandler.value
  if (fn == null) return
  return fn()
}

function closeFullscreen() {
  emit('update:fullscreen', false)
}

defineExpose({
  async run() {
    const runner = await untilNotNull(runnerRef)
    return runner.run()
  },
  async stop() {
    const runner = runnerRef.value
    if (runner == null) throw new Error('Runner is not available')
    return runner.stop()
  },
  async rerun() {
    const runner = runnerRef.value
    if (runner == null) throw new Error('Runner is not available')
    return runner.rerun()
  }
})
</script>

<template>
  <div ref="rootRef" class="project-runner-surface" :class="{ fullscreen: overlayActive }">
    <div v-if="overlayActive" class="placeholder"></div>
    <div
      ref="wrapperRef"
      v-radar="{ name: 'Project runner surface', desc: 'Container hosting project runner' }"
      class="runner-wrapper"
      :class="{
        fullscreen: overlayActive,
        visible: overlayVisible,
        closing: overlayClosing,
        opening: overlayOpening,
        'no-transition': overlayTransitionSuspended
      }"
      :style="{
        transformOrigin: '0 0',
        '--overlay-scale-x': overlayTransform.scaleX,
        '--overlay-scale-y': overlayTransform.scaleY,
        '--overlay-translate-x': `${overlayTransform.translateX}px`,
        '--overlay-translate-y': `${overlayTransform.translateY}px`
      }"
    >
      <div v-if="overlayActive && (overlayVisible || overlayClosing || overlayOpening)" class="header">
        <div class="header-left"></div>
        <div class="project-name">
          {{ project.name }}
        </div>
        <div class="header-right">
          <UIButton
            v-if="runnerState === 'initial'"
            v-radar="{ name: 'Run button', desc: 'Click to run the project in overlay' }"
            class="button"
            type="primary"
            icon="playHollow"
            :loading="runButtonLoading"
            @click="handleRunClick"
          >
            {{ $t({ en: 'Run', zh: '运行' }) }}
          </UIButton>
          <UIButton
            v-else
            v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project in overlay' }"
            class="button"
            icon="rotate"
            :disabled="runnerState !== 'running' || stopButtonLoading"
            :loading="rerunButtonLoading && !stopButtonLoading"
            @click="handleRerunClick"
          >
            {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
          </UIButton>
          <UIButton
            v-if="runnerState !== 'initial'"
            v-radar="{ name: 'Stop button', desc: 'Click to stop the project' }"
            class="button"
            type="boring"
            icon="end"
            :loading="stopButtonLoading"
            @click="handleStopClick"
          >
            {{ $t({ en: 'Stop', zh: '停止' }) }}
          </UIButton>
          <UITooltip>
            <template #trigger>
              <UIButton
                v-radar="{
                  name: 'Exit full screen button',
                  desc: 'Click to exit full screen for the running project'
                }"
                class="button"
                type="boring"
                icon="exitFullScreen"
                @click="closeFullscreen"
              ></UIButton>
            </template>
            {{ $t({ en: 'Exit full screen', zh: '退出全屏' }) }}
          </UITooltip>
        </div>
      </div>
      <div class="runner-area">
        <ProjectRunner
          ref="runnerRef"
          class="runner"
          :project="project"
          @console="(type, args) => emit('console', type, args)"
          @exit="(code) => emit('exit', code)"
        />
        <slot v-if="!overlayActive" name="inline-overlay" />
        <div v-if="overlayActive && initialLoading && !overlayOpening" class="overlay-loading"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.project-runner-surface {
  position: relative;
  width: 100%;
  height: 100%;
}

.placeholder {
  width: 100%;
  height: 100%;
}

.runner-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.4s ease-in-out;
  transform-origin: 0 0;
  transform: translate3d(var(--overlay-translate-x, 0px), var(--overlay-translate-y, 0px), 0)
    scale(var(--overlay-scale-x, 1), var(--overlay-scale-y, 1));
  opacity: 1;

  &.no-transition {
    transition: none !important;
  }

  &.fullscreen {
    position: fixed;
    z-index: 100;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background-color: #fff;
    opacity: 1;
    pointer-events: none;
    transition:
      transform 0.4s ease-in-out,
      background-color 0.2s ease;

    .header {
      opacity: 1;
      pointer-events: auto;
      transition:
        opacity 0.2s ease,
        height 0.2s ease,
        padding 0.2s ease,
        border-bottom-color 0.2s ease;
      transition-delay: 0s;
    }

    .runner-area {
      padding: 20px;
      background-color: var(--ui-color-grey-300);
      transition:
        padding 0.2s ease,
        background-color 0.2s ease;
    }

    &.visible {
      pointer-events: auto;
    }

    &.opening {
      background-color: transparent;

      .header {
        opacity: 0;
        visibility: hidden;
        height: 56px;
        padding: 0 20px;
        border-bottom-color: transparent;
      }

      .runner-area {
        padding: 20px;
        background-color: transparent;
      }
    }

    &.opening.visible {
      background-color: #fff;

      .header {
        opacity: 1;
        visibility: visible;
        height: 56px;
        padding: 0 20px;
        border-bottom-color: var(--ui-color-grey-400);
        transition-delay: 0.15s;
      }

      .runner-area {
        padding: 20px;
        background-color: var(--ui-color-grey-300);
        transition-delay: 0.15s;
      }
    }

    &.closing {
      background-color: transparent;
    }

    &.closing:not(.visible) {
      .header {
        opacity: 0;
      }

      .runner-area {
        background-color: transparent;
      }
    }

    &:not(.visible):not(.closing):not(.opening) {
      .header {
        display: none;
      }

      .runner-area {
        padding: 0;
        background-color: transparent;
      }
    }
  }
}

.header {
  display: flex;
  align-items: center;
  gap: 32px;
  font-size: 16px;
  border-bottom: 1px solid var(--ui-color-grey-400);
  height: 56px;
  color: var(--ui-color-title);
  background-color: #fff;
  padding: 0 20px;
  box-sizing: border-box;
  overflow: hidden;
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
  justify-content: flex-end;
  align-items: center;
  display: grid;
  grid-auto-flow: column;
  gap: 20px;
  justify-items: end;
}

.runner-area {
  position: relative;
  width: 100%;
  height: 100%;

  .runner {
    width: 100%;
    height: 100%;
    border-radius: var(--ui-border-radius-2);
    overflow: hidden;
  }
}

.project-runner-surface.fullscreen .runner-area {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 20px;
  background-color: var(--ui-color-grey-300);

  .runner {
    width: auto;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
  }
}

.overlay-loading {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
}
</style>
