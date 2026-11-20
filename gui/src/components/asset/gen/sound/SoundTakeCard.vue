<script lang="ts">
const SKELETON_HEIGHTS = [
  8, 13, 18, 11, 20, 15, 9, 17, 22, 12, 16, 19, 10, 14, 21, 13, 8, 18, 15, 11, 19, 14, 10, 13, 17, 21, 13, 9, 16, 22,
  14, 10, 18, 12, 8, 15, 20, 13, 11, 19, 14, 9, 16, 17, 12, 8, 14, 10
]
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIBlockItem, UICornerIcon, UIIcon } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import SoundWaveform from './SoundWaveform.vue'
import { formatAudioTime, type Sample } from './samples'

const props = withDefaults(
  defineProps<{
    name: string
    sample: Sample | null
    active?: boolean
    playing?: boolean
    /** Normalized playback progress in range `[0, 1]`. */
    progress?: number
    disabled?: boolean
    index: number
    play: () => Promise<void>
  }>(),
  {
    active: false,
    playing: false,
    progress: 0,
    disabled: false
  }
)

const emit = defineEmits<{
  select: []
  stop: []
  seek: [ratio: number]
}>()

const { t } = useI18n()

const isReady = computed(() => props.sample != null)
const canInteract = computed(() => isReady.value && !props.disabled)

const playingState = computed(() => (props.playing ? { progress: props.progress } : null))

const durationLabel = computed(() => {
  if (props.sample == null) return '--:--'
  const total = formatAudioTime(props.sample.seconds)
  if (props.playing) {
    const current = formatAudioTime(props.progress * props.sample.seconds)
    return `${current} / ${total}`
  }
  return total
})

const cardRadar = computed(() =>
  isReady.value
    ? {
        name: t({ en: `Sound candidate ${props.name}`, zh: `候选声音“${props.name}”` }),
        desc: t({ en: 'Click to select this generated sound', zh: '点击选择该生成的声音' })
      }
    : {
        name: t({ en: `Generating ${props.name}`, zh: `正在生成“${props.name}”` }),
        desc: t({ en: 'Sound candidate is being generated', zh: '候选声音正在生成中' })
      }
)

async function handlePlay() {
  if (!canInteract.value) return
  await props.play()
}
</script>

<template>
  <UIBlockItem
    v-radar="cardRadar"
    :active="active"
    :interactive="canInteract"
    :button-label="isReady ? t({ en: `Select ${name}`, zh: `选择“${name}”` }) : null"
    class="sound-take-card w-full! min-h-[82px]! h-auto! flex-row! items-center! gap-3! p-3.5!"
    :class="{ 'is-loading bg-grey-200!': !isReady }"
    :style="{ '--stagger-index': index }"
    @click="canInteract && emit('select')"
  >
    <div
      v-if="!isReady"
      aria-hidden="true"
      class="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-grey-300 text-grey-700"
    >
      <svg viewBox="0 0 36 36" class="loading-ring pointer-events-none absolute inset-0 h-full w-full">
        <circle class="loading-ring-track" cx="18" cy="18" r="17" />
        <circle class="loading-ring-arc" cx="18" cy="18" r="17" />
      </svg>
      <UIIcon type="play" class="h-3.5 w-3.5" />
    </div>
    <PlayControl
      v-else
      class="relative z-10 flex-none"
      :class="{
        'pointer-events-none': !canInteract,
        'opacity-60': disabled
      }"
      size="medium"
      :playing="playingState"
      :progress-interval="0"
      :play-handler="handlePlay"
      @stop="emit('stop')"
    />

    <div class="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-2.5">
      <div class="flex h-5 items-center justify-between gap-2">
        <span class="truncate text-sm font-medium" :class="isReady ? 'text-title' : 'text-hint-1'">
          {{ name }}
        </span>
        <span class="flex-none text-xs tabular-nums" :class="isReady ? 'text-hint-1' : 'text-hint-2 opacity-75'">
          {{ durationLabel }}
        </span>
      </div>

      <div
        v-if="!isReady"
        aria-hidden="true"
        class="skeleton-waveform relative flex h-6 w-full items-center gap-[2px] overflow-hidden"
      >
        <i
          v-for="(barHeight, barIndex) in SKELETON_HEIGHTS"
          :key="barIndex"
          class="skeleton-bar block flex-1 min-w-0 rounded-full bg-grey-500/60"
          :style="{ height: `${barHeight}px` }"
        />
        <span
          class="skeleton-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2"
          :style="{ animationDelay: `${index * 160}ms` }"
        />
      </div>
      <SoundWaveform
        v-else-if="sample != null"
        class="pointer-events-auto"
        :peaks="sample.peaks"
        :progress="playing ? progress : 0"
        :active="active"
        :playing="playing"
        :disabled="disabled"
        :label="name"
        @seek="emit('seek', $event)"
      />
    </div>

    <Transition name="corner-check">
      <UICornerIcon v-if="active" type="check" class="pointer-events-none z-20" />
    </Transition>
  </UIBlockItem>
</template>

<style scoped>
@keyframes sound-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes sound-ring-arc {
  0%,
  100% {
    stroke-dasharray: 22 85;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 44 63;
    stroke-dashoffset: -18;
  }
}

@keyframes sound-waveform-shimmer {
  0% {
    transform: translateX(-110%);
  }
  65%,
  100% {
    transform: translateX(210%);
  }
}

.sound-take-card {
  transition-property: background-color, box-shadow, transform;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

.sound-take-card.ui-block-item-interactive:hover:not(.ui-block-item-active) {
  box-shadow: var(--ui-box-shadow-control);
}

.sound-take-card.ui-block-item-interactive:has(> button:active) {
  transform: scale(0.98);
}

.sound-take-card.ui-block-item-active {
  box-shadow: 0 4px 12px rgba(36, 41, 47, 0.06);
}

.loading-ring {
  transform-origin: center;
  animation: sound-ring-spin 1.6s linear infinite;
}

.loading-ring circle {
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.loading-ring-track {
  stroke: var(--ui-color-grey-400);
}

.loading-ring-arc {
  stroke: var(--ui-color-primary-400);
  stroke-dasharray: 28 79;
  transform-origin: center;
  animation: sound-ring-arc 2.2s ease-in-out infinite;
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(251, 252, 253, 0) 0%,
    rgba(251, 252, 253, 0.72) 50%,
    rgba(251, 252, 253, 0) 100%
  );
  animation: sound-waveform-shimmer 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.corner-check-enter-active,
.corner-check-leave-active {
  transition-property: opacity, transform, filter;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

.corner-check-enter-from,
.corner-check-leave-to {
  opacity: 0;
  transform: scale(0.45);
  filter: blur(3px);
}

@media (prefers-reduced-motion: reduce) {
  .loading-ring,
  .loading-ring-arc,
  .skeleton-shimmer {
    animation: none;
  }

  .skeleton-shimmer {
    display: none;
  }

  .sound-take-card.ui-block-item-interactive:has(> button:active) {
    transform: none;
  }

  .corner-check-enter-active,
  .corner-check-leave-active {
    filter: none;
    transition: opacity 150ms ease;
  }

  .corner-check-enter-from,
  .corner-check-leave-to {
    transform: none;
  }
}
</style>
