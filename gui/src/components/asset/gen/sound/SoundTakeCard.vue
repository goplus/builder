<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/utils/audio'
import { UICornerIcon, UISoundItem } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import SoundDotLoading from './SoundDotLoading.vue'
import type { Sample } from './samples'

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
}>()

const isReady = computed(() => props.sample != null)
const canInteract = computed(() => isReady.value && !props.disabled)
const playingState = computed(() => (props.playing ? { progress: props.progress } : null))
const durationLabel = computed(() => (props.sample == null ? '' : formatDuration(props.sample.seconds)))

async function handlePlay() {
  if (!canInteract.value) return
  await props.play()
}
</script>

<template>
  <UISoundItem
    v-radar="{
      name: 'sound-candidate-item',
      desc: isReady ? 'Click to select this generated sound' : 'Sound candidate is being generated',
      attrs: { name }
    }"
    class="sound-take-card focus-visible:outline-2 focus-visible:outline-primary-main"
    :name="isReady ? name : ''"
    :duration="durationLabel"
    :selectable="canInteract ? { selected: active } : false"
    :role="canInteract ? 'button' : undefined"
    :tabindex="canInteract ? 0 : undefined"
    :aria-pressed="isReady ? active : undefined"
    @click="canInteract && emit('select')"
    @keydown.enter.prevent="canInteract && emit('select')"
    @keydown.space.prevent="canInteract && emit('select')"
  >
    <template v-if="sample != null" #player>
      <PlayControl
        :class="{ 'opacity-60': disabled }"
        size="large"
        :playing="playingState"
        :progress-interval="0"
        :play-handler="handlePlay"
        @stop="emit('stop')"
      />
    </template>
    <UICornerIcon v-if="isReady && active" type="check" />
    <SoundDotLoading :visible="!isReady" />
  </UISoundItem>
</template>
