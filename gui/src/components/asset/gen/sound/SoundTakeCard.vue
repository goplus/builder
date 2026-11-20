<script lang="ts">
const SKELETON_HEIGHTS = [
  8, 13, 18, 11, 20, 15, 9, 17, 22, 12, 16, 19, 10, 14, 21, 13, 8, 18, 15, 11, 19, 14, 10, 13, 17, 21, 13, 9, 16, 22,
  14, 10, 18, 12, 8, 15, 20, 13, 11, 19, 14, 9, 16, 17, 12, 8, 14, 10
]
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIBlockItem, UICornerIcon } from '@/components/ui'
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
  if (props.sample == null) return ''
  const total = formatAudioTime(props.sample.seconds)
  if (props.playing) {
    const current = formatAudioTime(props.progress * props.sample.seconds)
    return `${current} / ${total}`
  }
  return total
})

const basePhaseMs = computed(() => -2400 - props.index * 220)

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
    <div class="relative z-10 h-9 w-9 flex-none">
      <div
        aria-hidden="true"
        class="synth-medallion-slot pointer-events-none absolute inset-0 flex items-center justify-center"
        :class="isReady ? 'slot-hidden' : 'slot-visible'"
      >
        <div
          class="synth-medallion flex h-9 w-9 items-center justify-center rounded-full text-primary-600"
          :style="{ animationDelay: `${basePhaseMs}ms` }"
        >
          <svg viewBox="0 0 16 16" class="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              class="synth-sparkle-main"
              d="M6.75 2.75C6.98 6.12 8.13 7.27 11.5 7.5C8.13 7.73 6.98 8.88 6.75 12.25C6.52 8.88 5.37 7.73 2 7.5C5.37 7.27 6.52 6.12 6.75 2.75Z"
              fill="currentColor"
            />
            <path
              class="synth-sparkle-sub"
              :style="{ animationDelay: `${basePhaseMs}ms` }"
              d="M12.25 1.5C12.38 3.18 12.97 3.77 14.65 3.9C12.97 4.03 12.38 4.62 12.25 6.3C12.12 4.62 11.53 4.03 9.85 3.9C11.53 3.77 12.12 3.18 12.25 1.5Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      <div
        class="play-slot absolute inset-0 flex items-center justify-center"
        :class="isReady ? 'slot-visible' : 'slot-hidden pointer-events-none'"
        :inert="!canInteract"
      >
        <PlayControl
          class="flex-none"
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
      </div>
    </div>

    <div class="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col gap-2.5">
      <div class="flex h-5 items-center justify-between gap-2">
        <span
          class="truncate text-sm font-medium transition-colors duration-200"
          :class="isReady ? 'text-title' : 'text-hint-1'"
        >
          {{ name }}
        </span>
        <Transition name="duration-fade">
          <span v-if="durationLabel !== ''" class="flex-none text-xs tabular-nums text-hint-1">
            {{ durationLabel }}
          </span>
        </Transition>
      </div>

      <div class="relative h-6 w-full">
        <Transition name="waveform-crossfade">
          <div
            v-if="!isReady"
            key="synth"
            aria-hidden="true"
            class="synth-waveform flex h-6 w-full items-center gap-[2px]"
          >
            <i
              v-for="(barHeight, barIndex) in SKELETON_HEIGHTS"
              :key="barIndex"
              class="synth-bar block flex-1 min-w-0 rounded-full"
              :style="{
                height: `${barHeight}px`,
                animationDelay: `${basePhaseMs + barIndex * 24}ms`
              }"
            />
          </div>
          <SoundWaveform
            v-else-if="sample != null"
            key="ready"
            class="pointer-events-auto"
            :peaks="sample.peaks"
            :progress="playing ? progress : 0"
            :active="active"
            :playing="playing"
            :disabled="disabled"
            :label="name"
            @seek="emit('seek', $event)"
          />
        </Transition>
      </div>
    </div>

    <Transition name="corner-check">
      <UICornerIcon v-if="active" type="check" class="pointer-events-none z-20" />
    </Transition>
  </UIBlockItem>
</template>

<style scoped>
@keyframes sound-medallion-pulse {
  0%,
  72%,
  100% {
    transform: scale(0.96);
    opacity: 0.86;
  }
  16% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes sound-sparkle-twinkle {
  0%,
  72%,
  100% {
    opacity: 0.45;
  }
  20% {
    opacity: 1;
  }
}

@keyframes sound-synth-wave {
  0%,
  68%,
  100% {
    transform: scaleY(0.48);
    background-color: var(--ui-color-grey-400);
  }
  14% {
    background-color: var(--ui-color-blue-200);
  }
  28% {
    transform: scaleY(1);
    background-color: var(--ui-color-turquoise-300);
  }
  46% {
    background-color: var(--ui-color-blue-200);
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

.synth-medallion-slot,
.play-slot {
  transition-property: opacity, filter, transform;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

.slot-visible {
  opacity: 1;
  transform: scale(1);
  filter: blur(0px);
}

.slot-hidden {
  opacity: 0;
  transform: scale(0.25);
  filter: blur(4px);
}

.synth-medallion {
  background: linear-gradient(135deg, var(--ui-color-turquoise-200) 0%, var(--ui-color-blue-100) 100%);
  box-shadow: inset 0 0 0 1px rgba(54, 194, 207, 0.18);
  animation: sound-medallion-pulse 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.synth-sparkle-sub {
  animation: sound-sparkle-twinkle 2.4s ease-in-out infinite;
}

.synth-bar {
  transform-origin: center;
  background-color: var(--ui-color-grey-400);
  animation: sound-synth-wave 2.4s ease-in-out infinite;
}

.duration-fade-enter-active,
.duration-fade-leave-active {
  transition-property: opacity;
  transition-duration: 180ms;
  transition-timing-function: ease-out;
}

.duration-fade-enter-from,
.duration-fade-leave-to {
  opacity: 0;
}

.waveform-crossfade-enter-active,
.waveform-crossfade-leave-active {
  transition-property: opacity;
  transition-duration: 200ms;
  transition-timing-function: ease-out;
}

.waveform-crossfade-leave-active {
  position: absolute;
  inset: 0;
}

.waveform-crossfade-enter-from,
.waveform-crossfade-leave-to {
  opacity: 0;
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

@media (prefers-contrast: more) {
  .synth-medallion {
    color: var(--ui-color-primary-700);
    box-shadow: inset 0 0 0 1px var(--ui-color-primary-300);
  }

  .synth-bar {
    background-color: var(--ui-color-grey-600);
  }
}

@media (prefers-reduced-motion: reduce) {
  .synth-medallion,
  .synth-sparkle-sub,
  .synth-bar {
    animation: none;
  }

  .synth-medallion-slot,
  .play-slot {
    filter: none;
    transition: opacity 150ms ease;
  }

  .slot-hidden {
    transform: none;
    filter: none;
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
