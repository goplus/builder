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
  if (props.sample == null) return ''
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
    :class="{ 'is-loading': !isReady }"
    :style="{ '--stagger-index': index }"
    @click="canInteract && emit('select')"
  >
    <div
      v-if="!isReady"
      aria-hidden="true"
      class="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-grey-300 text-grey-700"
    >
      <UIIcon type="play" class="h-4 w-4" />
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
        <span v-if="durationLabel !== ''" class="flex-none text-xs tabular-nums text-hint-1">
          {{ durationLabel }}
        </span>
      </div>

      <div v-if="!isReady" aria-hidden="true" class="flex h-6 w-full items-center gap-[2px]">
        <i
          v-for="(barHeight, barIndex) in SKELETON_HEIGHTS"
          :key="barIndex"
          class="skeleton-bar block flex-1 min-w-0 rounded-full bg-grey-400"
          :style="{
            height: `${barHeight}px`,
            animationDelay: `${barIndex * 28}ms`
          }"
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
@property --sound-loading-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes sound-rotate-gradient {
  to {
    --sound-loading-angle: 360deg;
  }
}

@keyframes sound-skeleton-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.9;
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

.sound-take-card.is-loading::before {
  /* Force override UIBlockItem's border; matches GenItem.vue loading glow. */
  border: none;
  content: '';
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  background: conic-gradient(
    from var(--sound-loading-angle) at 50% 50%,
    #dcf7fa 100deg,
    #0bc0cf 288deg,
    rgba(243, 252, 253, 0.8) 324deg,
    #dcf7fa 360deg
  );
  background-position: center;
  background-repeat: no-repeat;
  background-size: 150% 150%;
  animation: sound-rotate-gradient 3s linear infinite;
}

.skeleton-bar {
  animation: sound-skeleton-pulse 1.8s ease-in-out infinite;
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
  .sound-take-card.is-loading::before {
    animation: none;
  }

  .skeleton-bar {
    animation: none;
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
