<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    peaks: number[]
    /** Normalized playback progress in range `[0, 1]`. */
    progress: number
    active?: boolean
    playing?: boolean
    disabled?: boolean
    label: string
  }>(),
  {
    active: false,
    playing: false,
    disabled: false
  }
)

const emit = defineEmits<{
  seek: [ratio: number]
}>()

const trackRef = ref<HTMLElement | null>(null)
const scrubbing = ref(false)
const hoverRatio = ref<number | null>(null)

function clampRatio(ratio: number) {
  return Math.max(0, Math.min(1, ratio))
}

function ratioFromEvent(event: PointerEvent) {
  const el = trackRef.value
  if (el == null) return 0
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return 0
  return clampRatio((event.clientX - rect.left) / rect.width)
}

function handlePointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  event.stopPropagation()
  const el = trackRef.value
  el?.setPointerCapture(event.pointerId)
  scrubbing.value = true
  const ratio = ratioFromEvent(event)
  hoverRatio.value = ratio
  emit('seek', ratio)
}

function handlePointerMove(event: PointerEvent) {
  if (props.disabled) return
  const ratio = ratioFromEvent(event)
  hoverRatio.value = ratio
  if (scrubbing.value) {
    emit('seek', ratio)
  }
}

function handlePointerUp(event: PointerEvent) {
  if (!scrubbing.value) return
  const el = trackRef.value
  if (el?.hasPointerCapture(event.pointerId)) {
    el.releasePointerCapture(event.pointerId)
  }
  scrubbing.value = false
}

function handlePointerLeave() {
  if (!scrubbing.value) {
    hoverRatio.value = null
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    emit('seek', clampRatio(props.progress + 0.05))
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    emit('seek', clampRatio(props.progress - 0.05))
  }
}

const clampedProgress = computed(() => clampRatio(props.progress))
const progressClip = computed(() => `inset(0 ${(1 - clampedProgress.value) * 100}% 0 0)`)
const baseBarClass = computed(() => (props.active ? 'bg-primary-300' : 'bg-grey-500'))
</script>

<template>
  <div
    ref="trackRef"
    v-radar="{
      name: 'sound-waveform',
      desc: 'Click or drag to seek audio playback',
      attrs: { name: label }
    }"
    role="slider"
    :tabindex="disabled ? -1 : 0"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(clampedProgress * 100)"
    class="relative z-10 h-6 w-full flex items-center touch-none select-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary-main"
    :class="disabled ? 'cursor-default' : 'cursor-pointer'"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @pointerleave="handlePointerLeave"
    @click.stop
    @keydown="handleKeydown"
  >
    <div class="h-full w-full flex items-center gap-0.5" aria-hidden="true">
      <i
        v-for="(peak, index) in peaks"
        :key="index"
        class="block min-w-0 flex-[1_1_0] rounded-full transition-colors duration-150"
        :class="baseBarClass"
        :style="{ height: `${Math.max(3, Math.round(peak * 22))}px` }"
      />
    </div>
    <div
      class="pointer-events-none absolute inset-0 flex items-center gap-0.5"
      aria-hidden="true"
      :style="{ clipPath: progressClip }"
    >
      <i
        v-for="(peak, index) in peaks"
        :key="index"
        class="block min-w-0 flex-[1_1_0] rounded-full bg-primary-main"
        :style="{ height: `${Math.max(3, Math.round(peak * 22))}px` }"
      />
    </div>
    <span
      v-if="hoverRatio != null && !disabled"
      aria-hidden="true"
      class="pointer-events-none absolute top-0.5 bottom-0.5 w-[1.5px] -translate-x-1/2 rounded-full bg-primary-main/65"
      :style="{ left: `${hoverRatio * 100}%` }"
    />
  </div>
</template>
