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
  /** Version async play requests so pause/stop can invalidate stale play() continuations after await. */
  let playRequestVersion = 0
  /** Latest requested preview seek time in ms while a browser seek may still be in flight. */
  let pendingSeekTime: number | null = null

  function flushPendingSeek(video: HTMLVideoElement) {
    if (pendingSeekTime == null) return
    const nextTime = pendingSeekTime
    pendingSeekTime = null
    video.currentTime = nextTime / 1000
  }

  function seek(timeInMs: number) {
    const nextTime = Math.max(0, timeInMs)
    currentTime.value = nextTime
    pendingSeekTime = nextTime
    const video = videoRef.value
    if (video == null || video.seeking) return
    flushPendingSeek(video)
  }

  function pausePlayback() {
    playRequestVersion += 1
    stopTick()
    const video = videoRef.value
    if (video == null) return
    video.pause()
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

  // Keep preview time inside the current play range when the range changes.
  watch(
    rangeRef,
    (newRange) => {
      if (newRange == null || videoRef.value == null) return
      if (currentTime.value >= newRange.start && currentTime.value < newRange.end) return
      seek(newRange.start)
    },
    { immediate: true }
  )

  watch(
    videoRef,
    (video, _, onCleanup) => {
      if (video == null) return
      const handleLoadedMetadata = () => {
        duration.value = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0
      }
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      const handleSeeked = () => flushPendingSeek(video)
      video.addEventListener('seeked', handleSeeked)
      onCleanup(() => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('seeked', handleSeeked)
      })
    },
    { immediate: true }
  )

  async function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    const requestVersion = ++playRequestVersion
    startTick()
    const video = await untilNotNull(videoRef)
    if (!isPlaying.value || requestVersion !== playRequestVersion) return
    return video.play()
  }

  function stop() {
    if (!isPlaying.value) return
    isPlaying.value = false
    pausePlayback()
  }

  return {
    isPlaying,
    duration,
    currentTime,
    seek,
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
import { useMessageHandle } from '@/utils/exception'
import type { File } from '@/models/common/file'
import type { FramesConfig } from '@/models/spx/gen/animation-gen'
import { UITooltip } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import ResourceCanvas from '@/components/editor/sprite/ResourceCanvas.vue'
import { useResourceCanvas } from '@/components/editor/sprite/resource-canvas'
import { useResourceWorkspace } from '@/components/editor/sprite/resource-workspace'

const props = defineProps<{
  video: File
  framesConfig: FramesConfig | null
  resourceKey?: string
  referenceImage?: File | null
  showControls?: boolean
}>()

const canvas = useResourceCanvas()
const workspace = useResourceWorkspace()
const videoSize = ref<{ width: number; height: number } | null>(null)

const emit = defineEmits<{
  ready: []
  'update:framesConfig': [FramesConfig]
}>()

const [videoSrc] = useFileUrl(() => props.video)
const videoRef = ref<HTMLVideoElement | null>(null)
const videoReady = ref(false)

function handleReady() {
  videoReady.value = true
  emit('ready')
}

/** Timepoint in ms to cut start */
const cutStartRef = ref(0)
/** Timepoint in ms to cut end */
const cutEndRef = ref(0)

/** Timeline snapping precision in ms */
const timelinePrecision = 100

function notifyFramesConfigChanged() {
  emit('update:framesConfig', {
    startTime: cutStartRef.value,
    duration: cutEndRef.value - cutStartRef.value,
    interval: props.framesConfig?.interval ?? 100
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

const { isPlaying, duration: videoDurationRef, currentTime, seek, play, stop } = useVideoPlayer(videoRef, playingRange)

const handlePlay = useMessageHandle(play, { en: 'Failed to play', zh: '播放失败' })

watch(
  [videoDurationRef, () => props.framesConfig],
  ([newDuration, config]) => {
    if (newDuration == null) return
    if (newDuration > 0) {
      if (config != null) {
        cutStartRef.value = clamp(config.startTime ?? 0, 0, newDuration)
        cutEndRef.value = clamp(cutStartRef.value + config.duration, cutStartRef.value, newDuration)
      } else if (cutEndRef.value === 0) {
        cutStartRef.value = 0
        cutEndRef.value = newDuration
        notifyFramesConfigChanged()
      }
    }
  },
  { immediate: true }
)

const trackInnerRef = ref<HTMLDivElement | null>(null)
const dragTarget = ref<DragTarget | null>(null)
const shouldNudge = ref(true)

async function startPlayback() {
  shouldNudge.value = false
  await play()
}

function togglePlayback() {
  shouldNudge.value = false
  return isPlaying.value ? stop() : handlePlay.fn()
}

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
  initialClientX: number
  initialTime: number
  wasPlaying: boolean
}

// TODO: Check if we can reuse `useDraggable` from utils

let dragging: Dragging | null = null

function stopDragging() {
  dragging = null
  dragTarget.value = null
  window.removeEventListener('pointermove', handleDragMove)
  window.removeEventListener('pointerup', handleDragEnd)
  window.removeEventListener('pointercancel', handleDragEnd)
}

onScopeDispose(stopDragging)

function getTimeFromPointer(clientX: number, rect: DOMRect, duration: number) {
  if (rect.width <= 0) return 0
  const ratio = (clientX - rect.left) / rect.width
  return clamp(ratio * duration, 0, duration)
}

function getPreviewTimeForDragTarget(target: Exclude<DragTarget, 'preview'>) {
  if (target === 'start') return cutStartRef.value
  // end - 1ms: keep the right-handle preview just inside the play range so it doesn't immediately wrap to start.
  return Math.max(cutStartRef.value, cutEndRef.value - 1)
}

function handleDragStart(target: DragTarget, e: PointerEvent) {
  // Ignore extra pointerdowns (for example from multi-touch) until the current drag finishes.
  if (dragging != null) return
  const rect = trackInnerRef.value?.getBoundingClientRect() ?? null
  if (rect == null || rect.width <= 0) return
  const videoDuration = videoDurationRef.value
  if (videoDuration == null) return
  const handle = e.currentTarget as HTMLElement
  handle.setPointerCapture(e.pointerId)
  shouldNudge.value = false
  dragTarget.value = target
  const wasPlaying = isPlaying.value
  stop()
  dragging = {
    target,
    pointerId: e.pointerId,
    rect,
    initialClientX: e.clientX,
    initialTime: target === 'start' ? cutStartRef.value : cutEndRef.value,
    wasPlaying
  }
  if (target === 'preview') {
    const time = getTimeFromPointer(e.clientX, dragging.rect, videoDuration)
    seek(clamp(time, cutStartRef.value, cutEndRef.value))
  } else {
    seek(getPreviewTimeForDragTarget(target))
  }
  e.preventDefault()
  window.addEventListener('pointermove', handleDragMove)
  window.addEventListener('pointerup', handleDragEnd)
  window.addEventListener('pointercancel', handleDragEnd)
}

function handleDragMove(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  const videoDuration = videoDurationRef.value
  if (videoDuration == null) return
  if (dragging.target === 'preview') {
    const time = getTimeFromPointer(e.clientX, dragging.rect, videoDuration)
    seek(clamp(time, cutStartRef.value, cutEndRef.value))
    return
  }
  // Move the original cut boundary by the pointer displacement to preserve the grab offset.
  const time = dragging.initialTime + ((e.clientX - dragging.initialClientX) / dragging.rect.width) * videoDuration
  if (dragging.target === 'start') {
    cutStartRef.value = adjustStartTime(time)
  } else {
    cutEndRef.value = adjustEndTime(time, videoDuration)
  }
  seek(getPreviewTimeForDragTarget(dragging.target))
}

function handleDragEnd(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  const { target, wasPlaying } = dragging
  stopDragging()
  if (target !== 'preview') {
    if (target === 'start') {
      cutStartRef.value = adjustStartTime(cutStartRef.value, true)
    } else {
      cutEndRef.value = adjustEndTime(cutEndRef.value, videoDurationRef.value!, true)
    }
    seek(getPreviewTimeForDragTarget(target))
    notifyFramesConfigChanged()
  }
  if (wasPlaying) play()
}

function handleTimelineKeydown(target: DragTarget, event: KeyboardEvent) {
  const duration = videoDurationRef.value
  if (duration == null) return
  const current = target === 'start' ? cutStartRef.value : target === 'end' ? cutEndRef.value : currentTime.value
  const step = event.shiftKey ? 1000 : timelinePrecision
  let time: number
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      time = current - step
      break
    case 'ArrowRight':
    case 'ArrowUp':
      time = current + step
      break
    case 'Home':
      time = 0
      break
    case 'End':
      time = duration
      break
    default:
      return
  }
  event.preventDefault()
  shouldNudge.value = false
  stop()
  if (target === 'preview') {
    seek(clamp(time, cutStartRef.value, Math.max(cutStartRef.value, cutEndRef.value - 1)))
    return
  }
  if (target === 'start') cutStartRef.value = adjustStartTime(time, true)
  else cutEndRef.value = adjustEndTime(time, duration, true)
  seek(getPreviewTimeForDragTarget(target))
  notifyFramesConfigChanged()
}

function adjustStartTime(newTime: number, withSnap = false) {
  const time = withSnap ? snap(newTime) : newTime
  return clamp(time, 0, Math.max(0, cutEndRef.value - minDuration.value))
}

function adjustEndTime(newTime: number, videoDuration: number, withSnap = false) {
  const minTime = Math.min(videoDuration, cutStartRef.value + minDuration.value)
  // Keep the exact video end selectable even when it falls between snap points.
  const time = withSnap && newTime > minTime && newTime < videoDuration ? snap(newTime) : newTime
  return clamp(time, minTime, videoDuration)
}

/** Minimum allowed segment duration in ms */
const minDuration = computed(() =>
  Math.min(
    timelinePrecision,
    props.framesConfig?.duration ?? timelinePrecision,
    videoDurationRef.value ?? timelinePrecision
  )
)

function snap(timeInMs: number) {
  return Math.round(timeInMs / timelinePrecision) * timelinePrecision
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
    v-radar="{ name: 'animation-video-preview', desc: 'Preview of the animation video' }"
    class="animation-video-preview"
  >
    <ResourceCanvas
      :resource-key="resourceKey ?? video.name"
      :image="referenceImage"
      :media-size="videoSize"
      class="h-full"
    >
      <video
        ref="videoRef"
        class="video"
        :class="{ ready: videoReady }"
        :src="videoSrc ?? undefined"
        playsinline
        preload="auto"
        muted
        loop
        @loadeddata="handleReady"
        @loadedmetadata="
          videoSize = videoRef == null ? null : { width: videoRef.videoWidth, height: videoRef.videoHeight }
        "
      />
      <template #media-overlay>
        <div
          v-if="!workspace?.busy.value"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 rounded-md border border-grey-400"
        ></div>
        <slot></slot>
      </template>
      <template #media-controls>
        <div
          v-if="showControls !== false && videoDurationRef != null"
          class="controls"
          :class="{ 'workspace-controls': canvas != null }"
        >
          <UITooltip>
            {{ $t(isPlaying ? { en: 'Pause', zh: '暂停' } : { en: 'Play selection', zh: '播放选中片段' }) }}
            <template #trigger>
              <PlayControl
                v-radar="{ name: 'play-button', desc: 'Toggle playback of animation video preview' }"
                :playing="isPlaying ? { progress: (currentTime - cutStartRef) / (cutEndRef - cutStartRef || 1) } : null"
                :progress-interval="0"
                :play-handler="startPlayback"
                role="button"
                tabindex="0"
                :aria-pressed="isPlaying"
                class="playback-button"
                @focus="shouldNudge = false"
                @keydown.enter.prevent="togglePlayback"
                @keydown.space.prevent="togglePlayback"
                @stop="stop"
              />
            </template>
          </UITooltip>
          <div class="timeline">
            <div class="track">
              <div
                ref="trackInnerRef"
                class="track-inner"
                :class="{ nudge: shouldNudge }"
                @mouseenter="shouldNudge = false"
                @focusin="shouldNudge = false"
              >
                <button
                  v-radar="{ name: 'Seek animation', desc: 'Drag to preview a frame in the selected segment' }"
                  type="button"
                  role="slider"
                  class="seek-surface"
                  :aria-valuemin="cutStartRef / 1000"
                  :aria-valuemax="cutEndRef / 1000"
                  :aria-valuenow="currentTime / 1000"
                  :aria-valuetext="formatTime(currentTime)"
                  @pointerdown="handleDragStart('preview', $event)"
                  @keydown="handleTimelineKeydown('preview', $event)"
                ></button>
                <div class="segment" :style="segmentStyle">
                  <button
                    v-radar="{ name: 'start-marker', desc: 'Drag to adjust start time of extracted segment' }"
                    class="segment-marker left"
                    :class="{ dragging: dragTarget === 'start' }"
                    type="button"
                    role="slider"
                    :aria-valuemin="0"
                    :aria-valuemax="Math.max(0, cutEndRef - minDuration) / 1000"
                    :aria-valuenow="cutStartRef / 1000"
                    :aria-valuetext="formatTime(cutStartRef)"
                    @pointerdown="handleDragStart('start', $event)"
                    @keydown="handleTimelineKeydown('start', $event)"
                  >
                    <span class="marker-time">{{ formatTime(cutStartRef) }}</span>
                    <i v-if="shouldNudge" class="marker-arrow"></i>
                  </button>
                  <button
                    v-radar="{ name: 'end-marker', desc: 'Drag to adjust end time of extracted segment' }"
                    class="segment-marker right"
                    :class="{ dragging: dragTarget === 'end' }"
                    type="button"
                    role="slider"
                    :aria-valuemin="Math.min(videoDurationRef, cutStartRef + minDuration) / 1000"
                    :aria-valuemax="videoDurationRef / 1000"
                    :aria-valuenow="cutEndRef / 1000"
                    :aria-valuetext="formatTime(cutEndRef)"
                    @pointerdown="handleDragStart('end', $event)"
                    @keydown="handleTimelineKeydown('end', $event)"
                  >
                    <span class="marker-time">{{ formatTime(cutEndRef) }}</span>
                    <i v-if="shouldNudge" class="marker-arrow"></i>
                  </button>
                </div>
                <span v-if="shouldNudge" class="track-hint">
                  {{ $t({ en: 'Drag to trim', zh: '拖动两端裁剪' }) }}
                </span>
                <i v-show="!shouldNudge" class="current-time" :style="currentTimeStyle"></i>
              </div>
            </div>
          </div>
          <UITooltip>
            <span class="selection-duration">
              {{ $t({ en: 'Selected', zh: '已选' }) }}
              {{ ((cutEndRef - cutStartRef) / 1000).toFixed(2) }} {{ $t({ en: 's', zh: '秒' }) }}
            </span>
            <template #trigger>
              <div class="timecode whitespace-nowrap text-xs text-grey-600">
                <span class="text-grey-900">{{ formatTime(currentTime) }}</span> / {{ formatTime(videoDurationRef) }}
              </div>
            </template>
          </UITooltip>
        </div>
      </template>
    </ResourceCanvas>
  </div>
</template>

<style scoped>
.animation-video-preview {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--ui-border-radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video {
  opacity: 0;
  transition: opacity 400ms ease-in-out;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video.ready {
  opacity: 1;
}

.controls {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
}

.workspace-controls {
  position: static;
  width: 100%;
  padding-block: 8px;
}

.timeline {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 10px;
}

.playback-button,
.timecode {
  flex: none;
}

.playback-button:focus-visible {
  outline: 2px solid var(--ui-color-primary-700);
  outline-offset: 3px;
  border-radius: 50%;
}

.track,
.track-inner {
  position: relative;
  width: 100%;
  height: 32px;
}

.track {
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-300);
}

.track-inner {
  isolation: isolate;
}

.seek-surface {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  border-radius: var(--ui-border-radius-sm);
}

.segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--ui-color-primary-200);
  pointer-events: none;
}

.segment-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  padding: 0;
  border: 1px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-main);
  cursor: ew-resize;
  touch-action: none;
  pointer-events: auto;
  z-index: 2;
}

.segment-marker.left {
  right: 100%;
  border-radius: var(--ui-border-radius-sm) 0 0 var(--ui-border-radius-sm);
}

.segment-marker.right {
  left: 100%;
  border-radius: 0 var(--ui-border-radius-sm) var(--ui-border-radius-sm) 0;
}

.segment-marker::before {
  content: '';
  position: absolute;
  inset: -6px -8px;
}

.segment-marker::after {
  content: '';
  display: block;
  margin: auto;
  width: 1px;
  height: 12px;
  border-radius: 1px;
  background: var(--ui-color-grey-100);
}

.segment-marker:hover,
.segment-marker.dragging {
  border-color: var(--ui-color-primary-600);
  background: var(--ui-color-primary-600);
}

.nudge .segment-marker.left {
  animation: nudge-start 2.4s ease-in-out infinite;
}

.nudge .segment-marker.right {
  animation: nudge-end 2.4s ease-in-out infinite;
}

.track-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-700);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
}

.marker-arrow {
  position: absolute;
  top: 4px;
  width: 16px;
  height: 16px;
  background: var(--ui-color-primary-main);
  mask: url('./marker-arrow.svg') center / contain no-repeat;
  pointer-events: none;
  animation: nudge-arrow 2.4s ease-in-out infinite;
}

.left .marker-arrow {
  left: 16px;
}

.right .marker-arrow {
  right: 16px;
  transform: rotate(180deg);
}

@keyframes nudge-arrow {
  0%,
  30%,
  70%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@keyframes nudge-start {
  0%,
  30%,
  70%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(8px);
  }
}

@keyframes nudge-end {
  0%,
  30%,
  70%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-8px);
  }
}

.seek-surface:focus-visible,
.segment-marker:focus-visible {
  outline: 2px solid var(--ui-color-primary-700);
  outline-offset: 2px;
}

.marker-time {
  position: absolute;
  bottom: calc(100% + 8px);
  padding: 4px 6px;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-sm);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-sm);
  color: var(--ui-color-grey-900);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  opacity: 0;
  pointer-events: none;
}

.left .marker-time {
  left: 0;
}

.right .marker-time {
  right: 0;
}

.segment-marker:hover .marker-time,
.segment-marker:focus-visible .marker-time,
.segment-marker.dragging .marker-time {
  opacity: 1;
}

.current-time {
  position: absolute;
  z-index: 3;
  top: -3px;
  bottom: -3px;
  width: 2px;
  transform: translateX(-1px);
  border-radius: 1px;
  background: var(--ui-color-grey-900);
  box-shadow: 0 0 0 1px var(--ui-color-grey-100);
  pointer-events: none;
}

.timecode {
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .video {
    transition: none;
  }

  .marker-arrow,
  .nudge .segment-marker.left,
  .nudge .segment-marker.right {
    animation: none;
  }
}
</style>
