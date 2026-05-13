<script lang="ts">
type PlayRange = {
  /** Timepoint in ms to start playing */
  start: number
  /** Timepoint in ms to end playing */
  end: number
}

function useVideoPlayer(videoRef: Ref<HTMLVideoElement | null>, rangeRef: WatchSource<PlayRange | null>) {
  const isPlaying = ref(false)
  /** Duration of the video in ms */
  const duration = ref<number | null>(null)
  /** Current playback time in ms */
  const currentTime = ref(0)

  function seek(timeInMs: number) {
    const video = videoRef.value
    if (video == null) return
    const nextTime = Math.max(0, timeInMs)
    video.currentTime = nextTime / 1000
    currentTime.value = nextTime
  }

  function pausePlayback() {
    stopTick()
    const video = videoRef.value
    if (video == null) return
    video.pause()
  }

  function suspend() {
    const wasPlaying = isPlaying.value
    isPlaying.value = false
    pausePlayback()
    return wasPlaying
  }

  const [startTick, stopTick] = useTick(() => {
    const video = videoRef.value
    if (video == null) return
    // Enforce range
    const range = toValue(rangeRef)
    if (range != null) {
      const rangeStartInSecond = range.start / 1000
      const rangeEndInSecond = range.end / 1000
      if (video.currentTime < rangeStartInSecond || video.currentTime >= rangeEndInSecond) {
        video.currentTime = rangeStartInSecond
      }
    }
    // Sync current time
    currentTime.value = video.currentTime * 1000
  })

  // If range changes, replay from range start
  watch(
    rangeRef,
    (newRange) => {
      if (newRange == null || videoRef.value == null) return
      if (currentTime.value >= newRange.start && currentTime.value < newRange.end) return
      seek(newRange.start)
    },
    { immediate: true }
  )

  function handleLoadedMetadata() {
    const video = videoRef.value
    if (video == null) return
    duration.value = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0
  }

  watch(
    videoRef,
    (video, _, onCleanup) => {
      if (video == null) return
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      onCleanup(() => video.removeEventListener('loadedmetadata', handleLoadedMetadata))
    },
    { immediate: true }
  )

  async function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    startTick()
    const video = await untilNotNull(videoRef)
    return video.play()
  }

  async function stop() {
    if (!isPlaying.value) return
    isPlaying.value = false
    pausePlayback()
  }

  return {
    isPlaying,
    duration,
    currentTime,
    seek,
    suspend,
    play,
    stop
  }
}

function useTick(fn: () => void) {
  let ticking = false
  function stop() {
    if (!ticking) return
    ticking = false
  }
  function start() {
    if (ticking) return
    ticking = true
    tick()
  }
  function tick() {
    if (!ticking) return
    fn()
    requestAnimationFrame(tick)
  }
  onScopeDispose(stop)
  return [start, stop] as const
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, toValue, watch, type Ref, type WatchSource } from 'vue'
import { useFileUrl } from '@/utils/file'
import { untilNotNull } from '@/utils/utils'
import type { File } from '@/models/common/file'
import type { FramesConfig } from '@/models/spx/gen/animation-gen'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import GenLoading from '../common/GenLoading.vue'

const props = defineProps<{
  video: File
  framesConfig: FramesConfig | null
}>()

const emit = defineEmits<{
  'update:framesConfig': [FramesConfig]
}>()

const [videoSrc] = useFileUrl(() => props.video)
const videoRef = ref<HTMLVideoElement | null>(null)

/** Timepoint in ms to cut start */
const cutStartRef = ref(0)
/** Timepoint in ms to cut end */
const cutEndRef = ref(0)

function notifyFramesConfigChanged() {
  const duration = cutEndRef.value - cutStartRef.value
  // TODO: We may improve the interval calculation logic later
  const interval = duration >= 2000 ? 300 : 100
  emit('update:framesConfig', {
    startTime: cutStartRef.value,
    duration: cutEndRef.value - cutStartRef.value,
    interval
  })
}

const playingRange = computed<PlayRange | null>(() => {
  if (props.framesConfig == null) return null
  const { startTime = 0, duration } = props.framesConfig
  return {
    start: startTime,
    end: startTime + duration
  }
})

const {
  isPlaying,
  duration: videoDurationRef,
  currentTime,
  seek,
  suspend,
  play,
  stop
} = useVideoPlayer(videoRef, playingRange)

/** Playback progress in range [0, 1] */
const progress = computed(() => {
  const range = playingRange.value
  if (range == null) return 0
  const played = currentTime.value - range.start
  const total = range.end - range.start
  if (total <= 0) return 0
  return played / total
})

watch(
  videoDurationRef,
  (newDuration) => {
    if (newDuration == null) return
    // Initialize cut range when video duration is known
    // This causes cut range to reset when selected animation / costume changes, it'll be better
    // to persist the cut range across animation / costume selections. TODO: Improve this later
    if (newDuration > 0 && cutEndRef.value === 0) {
      cutStartRef.value = 0
      cutEndRef.value = newDuration
      notifyFramesConfigChanged()
    }
  },
  { immediate: true }
)

const trackInnerRef = ref<HTMLDivElement | null>(null)
// Shows nudge animation on mount, hides after first user hover
const shouldNudge = ref(true)

const segmentStyle = computed(() => {
  const duration = videoDurationRef.value
  if (duration == null) return null
  const [start, end] = [cutStartRef.value, cutEndRef.value].map((ms) => Math.min(1, Math.max(0, ms / duration)))
  return {
    left: start * 100 + '%',
    right: (1 - end) * 100 + '%'
  }
})

const currentTimeStyle = computed(() => {
  const duration = videoDurationRef.value
  if (duration == null) return null
  const left = Math.min(1, Math.max(0, currentTime.value / duration)) * 100 + '%'
  return { left }
})

type DragTarget = 'start' | 'end' | 'preview'
type Dragging = {
  target: DragTarget
  pointerId: number
  rect: DOMRect
  resumePlayback: boolean
}

// TODO: Check if we can reuse `useDraggable` from utils

let dragging: Dragging | null = null

function stopDragging() {
  dragging = null
  window.removeEventListener('pointermove', handleDragMove)
  window.removeEventListener('pointerup', handleDragEnd)
  window.removeEventListener('pointercancel', handleDragEnd)
}

onScopeDispose(stopDragging)

function getTrackProgressRect() {
  return trackInnerRef.value?.getBoundingClientRect() ?? null
}

function getPreviewTimeForDragTarget(target: Exclude<DragTarget, 'preview'>) {
  if (target === 'start') return cutStartRef.value
  return Math.max(cutStartRef.value, cutEndRef.value - 1)
}

function getTimeFromPointer(clientX: number, rect: DOMRect, duration: number) {
  if (rect.width <= 0) return 0
  const ratio = (clientX - rect.left) / rect.width
  return clamp(ratio * duration, 0, duration)
}

function updatePreviewTime(clientX: number) {
  if (dragging == null) return
  const videoDuration = videoDurationRef.value
  if (videoDuration == null) return
  const time = getTimeFromPointer(clientX, dragging.rect, videoDuration)
  seek(clamp(time, cutStartRef.value, cutEndRef.value))
}

function handleDragStart(target: DragTarget, e: PointerEvent) {
  const rect = getTrackProgressRect()
  if (rect == null) return
  shouldNudge.value = false
  dragging = {
    target,
    pointerId: e.pointerId,
    rect,
    resumePlayback: suspend()
  }
  if (target === 'preview') {
    updatePreviewTime(e.clientX)
  } else {
    seek(getPreviewTimeForDragTarget(target))
  }
  e.preventDefault()
  window.addEventListener('pointermove', handleDragMove)
  window.addEventListener('pointerup', handleDragEnd)
  window.addEventListener('pointercancel', handleDragEnd)
}

function handlePreviewStart(e: PointerEvent) {
  if (e.target !== e.currentTarget) return
  handleDragStart('preview', e)
}

function handleDragMove(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  const videoDuration = videoDurationRef.value
  if (videoDuration == null) return
  if (dragging.target === 'preview') {
    updatePreviewTime(e.clientX)
    return
  }
  const time = getTimeFromPointer(e.clientX, dragging.rect, videoDuration)
  const minDuration = precision
  if (dragging.target === 'start') {
    cutStartRef.value = clamp(time, 0, cutEndRef.value - minDuration)
  } else {
    cutEndRef.value = clamp(time, cutStartRef.value + minDuration, videoDuration)
  }
  seek(getPreviewTimeForDragTarget(dragging.target))
}

function handleDragEnd(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  const { target, resumePlayback } = dragging
  stopDragging()
  if (target !== 'preview') {
    snapDraggedRange(target)
    seek(getPreviewTimeForDragTarget(target))
    notifyFramesConfigChanged()
  }
  if (resumePlayback) play()
}

function snapDraggedRange(target: Exclude<DragTarget, 'preview'>) {
  const videoDuration = videoDurationRef.value
  if (videoDuration == null) return
  const minDuration = precision
  if (target === 'start') {
    cutStartRef.value = clamp(snap(cutStartRef.value), 0, cutEndRef.value - minDuration)
  } else {
    cutEndRef.value = clamp(snap(cutEndRef.value), cutStartRef.value + minDuration, videoDuration)
  }
}

/** Precision for snapping in ms */
const precision = 100
function snap(timeInMs: number) {
  return Math.round(timeInMs / precision) * precision
}

function clamp(timeInMs: number, min: number, max: number) {
  return Math.min(max, Math.max(min, timeInMs))
}

/** format time (ms) in `ss.ss`, e.g. `03.50` for 3.5 seconds */
function formatTime(timeInMs: number) {
  return ('00' + (timeInMs / 1000).toFixed(2)).slice(-5)
}
</script>

<template>
  <div
    v-radar="{ name: 'Animation video preview', desc: 'Preview of the animation video' }"
    class="animation-video-preview"
  >
    <div class="preview-area">
      <video ref="videoRef" class="video" :src="videoSrc ?? undefined" playsinline preload="metadata" muted loop />
    </div>
    <GenLoading :visible="videoDurationRef == null" cover>
      {{ $t({ en: 'Loading video...', zh: '正在加载视频...' }) }}
    </GenLoading>
    <div v-if="videoDurationRef != null" class="controls">
      <PlayControl
        v-radar="{ name: 'Play button', desc: 'Toggle playback of animation video preview' }"
        :playing="isPlaying ? { progress } : null"
        :progress-interval="0"
        :play-handler="play"
        @stop="stop"
      />
      <div class="timeline">
        <div class="track">
          <div
            ref="trackInnerRef"
            class="track-inner"
            :class="{ nudge: shouldNudge }"
            @mouseenter.once="shouldNudge = false"
          >
            <div class="segment" :style="segmentStyle" @pointerdown="handlePreviewStart">
              <button
                v-radar="{ name: 'Start marker', desc: 'Drag to adjust start time of extracted segment' }"
                class="segment-marker left"
                type="button"
                @pointerdown="handleDragStart('start', $event)"
              ></button>
              <button
                v-radar="{ name: 'End marker', desc: 'Drag to adjust end time of extracted segment' }"
                class="segment-marker right"
                type="button"
                @pointerdown="handleDragStart('end', $event)"
              ></button>
            </div>
            <button
              class="current-time"
              :style="currentTimeStyle"
              type="button"
              @pointerdown="handleDragStart('preview', $event)"
            ></button>
            <div class="track-tips">
              {{ $t({ zh: '拖动滑块截取动画片段', en: 'Drag markers to cut animation segment' }) }}
            </div>
          </div>
        </div>
        <div class="flex items-center text-xs">
          <span class="w-9 text-grey-700">{{ formatTime(currentTime) }}</span>
          <span class="mr-1 text-grey-600">/</span>
          <span class="w-9 text-grey-600">{{ formatTime(videoDurationRef) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes leftMarker {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(15px);
  }
}
@keyframes rightMarker {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-15px);
  }
}
@keyframes markerArrow {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.animation-video-preview {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-area {
  position: relative;
  width: 100%;
  height: 100%;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.controls {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--ui-color-primary-300);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.timeline {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.track {
  position: relative;
  width: 100%;
  height: 20px;
  padding: 0 11px; /* 11px = segment-marker width + current-time width/2 */
  background: var(--ui-color-grey-400);
  border-radius: 2px;
}

.track-inner {
  position: relative;
  width: 100%;
  height: 100%;
  isolation: isolate;
}

.track-inner.nudge .segment-marker::after {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  position: absolute;
  background-color: var(--ui-color-turquoise-300);
  mask-image: url('@/components/asset/gen/animation/marker-arrow.svg');
  mask-size: contain;
  mask-repeat: no-repeat;
}

.track-inner.nudge .segment-marker.left {
  animation: leftMarker 1.8s infinite ease-in-out;
}

.track-inner.nudge .segment-marker.left::after {
  right: -24px;
  animation: markerArrow 1.8s infinite ease-in-out;
}

.track-inner.nudge .segment-marker.right {
  animation: rightMarker 1.8s infinite ease-in-out;
}

.track-inner.nudge .segment-marker.right::after {
  left: -24px;
  transform: rotateY(180deg);
  animation: markerArrow 1.8s infinite ease-in-out;
}

.track-inner.nudge .track-tips {
  display: block;
}

.track-inner.nudge .current-time {
  display: none;
}

.segment {
  position: absolute;
  margin: 0 -11px;
  top: 0;
  bottom: 0;
  background: var(--ui-color-primary-200);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  cursor: pointer;
}

.segment-marker {
  width: 10px;
  height: 20px;
  background: var(--ui-color-primary-500);
  border-radius: 2px;
  border: none;
  padding: 0;
  cursor: ew-resize;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Ensure it stays above .current-time to prioritize .segment-marker as it is interactive. */
  z-index: 1;
}

.segment-marker::before {
  content: '';
  display: block;
  width: 1px;
  height: 12px;
  background: var(--ui-color-grey-100);
}

.track-tips {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--ui-color-grey-700);
  display: none;
}

.current-time {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.current-time::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -1px;
  width: 2px;
  border-radius: 1px;
  background: var(--ui-color-yellow-500);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.current-time::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -6px;
  width: 12px;
}

.current-time::before,
.current-time::after {
  pointer-events: none;
}
</style>
