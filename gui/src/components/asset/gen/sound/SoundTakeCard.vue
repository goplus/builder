<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIBlockItem, UICornerIcon } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import GenLoading from '../common/GenLoading.vue'
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
    :style="{ '--stagger-index': index }"
    @click="canInteract && emit('select')"
  >
    <GenLoading v-if="!isReady" animation-style="width: 60px; height: 60px;" cover />
    <template v-else>
      <PlayControl
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
          <span class="truncate text-sm font-medium text-title">
            {{ name }}
          </span>
          <span class="flex-none text-xs tabular-nums text-hint-1">
            {{ durationLabel }}
          </span>
        </div>

        <SoundWaveform
          v-if="sample != null"
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
    </template>

    <Transition name="corner-check">
      <UICornerIcon v-if="active" type="check" class="pointer-events-none z-20" />
    </Transition>
  </UIBlockItem>
</template>

<style scoped>
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
