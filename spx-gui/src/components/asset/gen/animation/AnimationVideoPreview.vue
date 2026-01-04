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
  const duration = ref(0)
  /** Current playback time in ms */
  const currentTime = ref(0)

  const [startTick, stopTick] = useTick(() => {
    const video = videoRef.value
    if (video == null) return
    enforceRange()
    currentTime.value = video.currentTime * 1000
  })

  function enforceRange() {
    const video = videoRef.value
    if (video == null) return
    const range = toValue(rangeRef)
    if (range == null) return
    const rangeStartInSecond = range.start / 1000
    const rangeEndInSecond = range.end / 1000
    if (video.currentTime < rangeStartInSecond || video.currentTime >= rangeEndInSecond) {
      video.currentTime = rangeStartInSecond
    }
  }

  watch(rangeRef, enforceRange, { immediate: true })

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

  async function pause() {
    if (!isPlaying.value) return
    isPlaying.value = false
    stopTick()
    const video = await untilNotNull(videoRef)
    video.pause()
  }

  function togglePlay() {
    if (isPlaying.value) pause()
    else play()
  }

  return {
    isPlaying,
    duration,
    currentTime,
    play,
    togglePlay
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
  return [start, stop] as const
}
</script>

<script setup lang="ts">
import { computed, ref, toValue, watch, type Ref, type WatchSource } from 'vue'
import { useFileUrl } from '@/utils/file'
import { untilNotNull } from '@/utils/utils'
import type { File } from '@/models/common/file'
import type { FramesConfig } from '@/models/gen/animation-gen'
import { UIIcon } from '@/components/ui'
import CheckerboardBackground from '@/components/editor/sprite/CheckerboardBackground.vue'

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
  emit('update:framesConfig', {
    startTime: cutStartRef.value,
    duration: cutEndRef.value - cutStartRef.value,
    interval: 100
  })
}

const {
  isPlaying,
  duration: videoDurationRef,
  currentTime,
  play,
  togglePlay
} = useVideoPlayer(videoRef, () => {
  if (props.framesConfig == null) return null
  const { startTime, duration } = props.framesConfig
  if (startTime == null) return null
  return {
    start: startTime,
    end: startTime + duration
  }
})

watch(
  videoDurationRef,
  (newDuration) => {
    // Initialize cut range when video duration is known
    if (newDuration > 0 && cutEndRef.value === 0) {
      cutStartRef.value = 0
      cutEndRef.value = newDuration
      notifyFramesConfigChanged()
    }
  },
  { immediate: true }
)

const trackRef = ref<HTMLDivElement | null>(null)

const segmentStyle = computed(() => {
  const duration = videoDurationRef.value
  if (duration <= 0) return null
  const [start, end] = [cutStartRef.value, cutEndRef.value].map((ms) => Math.min(1, Math.max(0, ms / duration)))
  return {
    left: start * 100 + '%',
    right: (1 - end) * 100 + '%'
  }
})

const currentTimeStyle = computed(() => {
  const duration = videoDurationRef.value
  if (duration <= 0) return null
  const left = Math.min(1, Math.max(0, currentTime.value / duration)) * 100 + '%'
  return { left }
})

type DragTarget = 'start' | 'end'
type Dragging = {
  target: DragTarget
  pointerId: number
  rect: DOMRect
}

let dragging: Dragging | null = null

function handleDragStart(target: DragTarget, e: PointerEvent) {
  const track = trackRef.value
  if (track == null) return
  const rect = track.getBoundingClientRect()
  dragging = {
    target,
    pointerId: e.pointerId,
    rect
  }
  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
  window.addEventListener('pointermove', handleDragMove)
  window.addEventListener('pointerup', handleDragEnd)
  window.addEventListener('pointercancel', handleDragEnd)
}

function handleDragMove(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  const videoDuration = videoDurationRef.value
  if (videoDuration <= 0) return
  const ratio = (e.clientX - dragging.rect.left) / dragging.rect.width
  const time = snap(ratio * videoDuration)
  const minDuration = precision
  if (dragging.target === 'start') {
    cutStartRef.value = clamp(time, 0, cutEndRef.value - minDuration)
  } else {
    cutEndRef.value = clamp(time, cutStartRef.value + minDuration, videoDuration)
  }
}

function handleDragEnd(e: PointerEvent) {
  if (dragging == null || e.pointerId !== dragging.pointerId) return
  dragging = null
  window.removeEventListener('pointermove', handleDragMove)
  window.removeEventListener('pointerup', handleDragEnd)
  window.removeEventListener('pointercancel', handleDragEnd)
  notifyFramesConfigChanged()
  play()
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
  <div class="animation-video-preview">
    <CheckerboardBackground class="background" />
    <div class="preview-area">
      <video ref="videoRef" class="video" :src="videoSrc ?? undefined" playsinline preload="metadata" loop />
    </div>
    <div class="controls">
      <button
        v-radar="{ name: 'Play button', desc: 'Toggle playback of animation video preview' }"
        class="play-button"
        type="button"
        :aria-label="$t({ en: 'Play', zh: '播放' })"
        @click="togglePlay"
      >
        <!-- TODO: should be icon for pause instead of stop -->
        <UIIcon class="play-icon" :type="isPlaying ? 'stop' : 'play'" />
      </button>
      <div class="timeline">
        <div ref="trackRef" class="track">
          <div class="track-inner">
            <div class="segment" :style="segmentStyle">
              <button
                v-radar="{ name: 'Start marker', desc: 'Drag to adjust start time of extracted segment' }"
                class="segment-marker"
                type="button"
                @pointerdown="handleDragStart('start', $event)"
              />
              <button
                v-radar="{ name: 'End marker', desc: 'Drag to adjust end time of extracted segment' }"
                class="segment-marker"
                type="button"
                @pointerdown="handleDragStart('end', $event)"
              />
            </div>
            <i class="current-time" :style="currentTimeStyle"></i>
          </div>
        </div>
        <div class="time-row">
          <span class="time">{{ formatTime(0) }}</span>
          <span class="time">{{ formatTime(videoDurationRef) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.background {
  position: absolute;
  inset: 0;
}

.preview-area {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
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

/* TODO: check style details for play button */
.play-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 18px;
  padding: 10px;
  background: var(--ui-color-primary-500);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.15);
    background: var(--ui-color-primary-600);
  }

  &:active {
    transform: scale(1.15);
    background: var(--ui-color-primary-700);
  }
}

.play-icon {
  width: 16px;
  height: 16px;
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
  padding: 0 5px;
  background: var(--ui-color-grey-400);
  border-radius: 2px;
}

.track-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.segment {
  position: absolute;
  margin: 0 -5px;
  top: 0;
  bottom: 0;
  background: var(--ui-color-primary-200);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
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
}

.current-time {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-1px);
  background: var(--ui-color-primary-500);
}

.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  color: var(--ui-color-grey-700);
}

.time {
  white-space: nowrap;
}
</style>
