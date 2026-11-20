<script setup lang="ts">
import { computed } from 'vue'
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

async function handlePlay() {
  if (!canInteract.value) return
  await props.play()
}
</script>

<template>
  <UIBlockItem
    v-radar="{
      name: 'sound-candidate-item',
      desc: isReady ? 'Click to select this generated sound' : 'Sound candidate is being generated',
      attrs: { name }
    }"
    class="sound-take-card h-auto min-h-21 w-full flex-row items-center gap-3 p-3.5 focus-visible:outline-2 focus-visible:outline-primary-main"
    :active="active"
    :interactive="canInteract"
    :role="canInteract ? 'button' : undefined"
    :tabindex="canInteract ? 0 : undefined"
    :aria-pressed="isReady ? active : undefined"
    @click="canInteract && emit('select')"
    @keydown.enter.prevent="canInteract && emit('select')"
    @keydown.space.prevent="canInteract && emit('select')"
  >
    <GenLoading v-if="!isReady" cover animation-style="width: 56px; height: 56px;" />
    <template v-else-if="sample != null">
      <div class="h-9 w-9 flex-none">
        <PlayControl
          :class="{ 'opacity-60': disabled }"
          size="medium"
          :playing="playingState"
          :progress-interval="0"
          :play-handler="handlePlay"
          @stop="emit('stop')"
        />
      </div>

      <div class="min-w-0 flex-[1_1_0] flex flex-col gap-2">
        <div class="h-5 flex items-center justify-between gap-2">
          <span class="truncate text-sm text-title" :title="name">
            {{ name }}
          </span>
          <span class="flex-none text-xs text-hint-1 tabular-nums">
            {{ durationLabel }}
          </span>
        </div>

        <SoundWaveform
          :peaks="sample.peaks"
          :progress="playing ? progress : 0"
          :active="active"
          :playing="playing"
          :disabled="disabled"
          :label="name"
          @seek="emit('seek', $event)"
        />
      </div>

      <UICornerIcon v-if="active" type="check" />
    </template>
  </UIBlockItem>
</template>
