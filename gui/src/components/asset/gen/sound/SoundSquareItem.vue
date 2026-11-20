<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/utils/audio'
import { UIBlockItem, UIBlockItemTitle, UICornerIcon } from '@/components/ui'
import PlayControl from '@/components/editor/common/PlayControl.vue'
import GenLoading from '../common/GenLoading.vue'
import type { Sample } from './samples'

const props = withDefaults(
  defineProps<{
    name: string
    sample: Sample | null
    durationSeconds?: number | null
    active?: boolean
    compact?: boolean
    playing?: boolean
    progress?: number
    disabled?: boolean
    play: () => Promise<void>
  }>(),
  {
    durationSeconds: null,
    active: false,
    compact: false,
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
const durationLabel = computed(() => {
  if (props.sample == null) return ''
  return formatDuration(props.durationSeconds ?? props.sample.seconds)
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
    :size="compact ? 'medium' : 'large'"
    :active="active"
    :interactive="canInteract"
    :role="canInteract ? 'button' : undefined"
    :tabindex="canInteract ? 0 : undefined"
    :aria-pressed="isReady ? active : undefined"
    class="focus-visible:outline-2 focus-visible:outline-primary-main"
    @click="canInteract && emit('select')"
    @keydown.enter.prevent="canInteract && emit('select')"
    @keydown.space.prevent="canInteract && emit('select')"
  >
    <GenLoading
      v-if="!isReady"
      cover
      :animation-style="compact ? 'width: 48px; height: 48px;' : 'width: 60px; height: 60px;'"
    />
    <template v-else-if="compact">
      <div class="my-3 h-9 w-9">
        <PlayControl
          :class="{ 'opacity-60': disabled }"
          size="medium"
          :playing="playingState"
          :progress-interval="0"
          :play-handler="handlePlay"
          @stop="emit('stop')"
        />
      </div>
      <UIBlockItemTitle size="medium" :title="name">
        {{ name }}
      </UIBlockItemTitle>
    </template>
    <template v-else>
      <div class="mt-0.5 h-23 flex items-center justify-center">
        <div class="h-12 w-12">
          <PlayControl
            :class="{ 'opacity-60': disabled }"
            size="large"
            :playing="playingState"
            :progress-interval="0"
            :play-handler="handlePlay"
            @stop="emit('stop')"
          />
        </div>
      </div>
      <UIBlockItemTitle class="h-5" size="large" :title="name">
        {{ name }}
      </UIBlockItemTitle>
      <div class="text-center text-2xs text-hint-1 tabular-nums">{{ durationLabel }}</div>
    </template>
    <UICornerIcon v-if="active" type="check" />
  </UIBlockItem>
</template>
