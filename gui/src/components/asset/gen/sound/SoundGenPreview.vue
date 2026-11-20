<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDuration } from '@/utils/audio'
import { UIButton, UIIcon } from '@/components/ui'
import AssetName from '@/components/asset/AssetName.vue'
import PlayControl, { type Playing } from '@/components/editor/common/PlayControl.vue'
import VolumeSlider from '@/components/editor/stage/sound/VolumeSlider.vue'
import { WaveformPlayer } from '@/components/editor/stage/sound/waveform'
import GenLoading from '../common/GenLoading.vue'
import type { Sample } from './samples'

export type AudioTrimRange = {
  left: number
  right: number
}

const props = withDefaults(
  defineProps<{
    name: string
    sample: Sample | null
    range: AudioTrimRange
    gain: number
    generating?: boolean
    loadingText?: string
    disabled?: boolean
  }>(),
  {
    generating: false,
    loadingText: '',
    disabled: false
  }
)

const emit = defineEmits<{
  rename: []
  reset: []
  'update:range': [range: AudioTrimRange]
  'update:gain': [gain: number]
  play: []
  stop: []
  progress: [progress: number]
}>()

const waveformPlayerRef = ref<InstanceType<typeof WaveformPlayer> | null>(null)
const audioUrl = ref<string | null>(null)
const playing = ref<Playing | null>(null)

watch(
  () => props.sample,
  (sample, _prev, onCleanup) => {
    playing.value = null
    if (sample == null) {
      audioUrl.value = null
      return
    }
    const url = URL.createObjectURL(sample.blob)
    audioUrl.value = url
    onCleanup(() => {
      URL.revokeObjectURL(url)
    })
  },
  { immediate: true }
)

const editing = computed(() => props.range.left !== 0 || props.range.right !== 1 || props.gain !== 1)

const formattedTrimmedDuration = computed(() => {
  if (props.sample == null) return ''
  return formatDuration(props.sample.seconds * (props.range.right - props.range.left))
})

function clampTrimRange(next: AudioTrimRange): AudioTrimRange {
  const seconds = props.sample?.seconds ?? 1
  // Guarantee a minimum 50ms / 2% span so trim boundaries never collapse to zero length.
  const minSpan = Math.min(0.25, Math.max(0.02, 0.05 / Math.max(seconds, 0.1)))
  let left = Math.max(0, Math.min(1, next.left))
  let right = Math.max(0, Math.min(1, next.right))
  if (right - left < minSpan) {
    if (left !== props.range.left) {
      left = Math.max(0, right - minSpan)
    } else {
      right = Math.min(1, left + minSpan)
    }
  }
  return { left, right }
}

function handleRangeUpdate(next: AudioTrimRange) {
  if (props.disabled) return
  emit('update:range', clampTrimRange(next))
}

function handleGainUpdate(nextGain: number) {
  if (props.disabled) return
  emit('update:gain', nextGain)
  void Promise.resolve(waveformPlayerRef.value?.play()).catch(() => {
    // Ignore AbortError when rapid slider updates or immediate stop interrupt pending play().
  })
}

function handleResetEdit() {
  if (props.disabled) return
  waveformPlayerRef.value?.stop()
  playing.value = null
  emit('reset')
}

async function handlePlayClick() {
  if (props.disabled || waveformPlayerRef.value == null) return
  await waveformPlayerRef.value.play()
}

function handleStopClick() {
  waveformPlayerRef.value?.stop()
  playing.value = null
  emit('stop')
}

function handlePlay() {
  playing.value = { progress: 0 }
  emit('play')
}

function handleStop() {
  playing.value = null
  emit('stop')
}

function handleProgress(value: number) {
  if (playing.value != null) {
    playing.value.progress = Math.max(playing.value.progress, value)
  }
  emit('progress', value)
}

defineExpose({
  play: handlePlayClick,
  stop: handleStopClick
})
</script>

<template>
  <div
    v-radar="{ name: 'sound-preview', desc: 'Preview and edit the selected generated sound' }"
    class="relative h-full w-full flex flex-col justify-center gap-6 overflow-hidden rounded-lg border border-grey-400 bg-grey-100 px-6 py-6"
  >
    <GenLoading v-if="generating && sample == null" cover>
      {{ loadingText }}
    </GenLoading>
    <div
      v-else-if="sample == null"
      class="h-full w-full flex items-center justify-center rounded-md bg-grey-300 text-grey-800"
    >
      {{ $t({ zh: '请在左侧选择一段声音进行预览和裁剪', en: 'Select a sound on the left to preview and trim' }) }}
    </div>
    <template v-else>
      <div class="flex flex-col items-center">
        <div class="flex items-center gap-2 text-title">
          <AssetName>{{ name }}</AssetName>
          <UIIcon
            v-radar="{ name: 'rename-sound', desc: 'Click to rename the sound' }"
            class="cursor-pointer text-grey-900 hover:text-grey-800 active:text-grey-1000"
            :title="$t({ en: 'Rename', zh: '重命名' })"
            type="edit"
            @click="!disabled && emit('rename')"
          />
        </div>
        <div class="text-grey-700 leading-4.5 tabular-nums">
          {{ formattedTrimmedDuration || '&nbsp;' }}
        </div>
      </div>

      <WaveformPlayer
        v-if="audioUrl != null"
        ref="waveformPlayerRef"
        style="height: 222px"
        :audio-src="audioUrl"
        :range="range"
        :gain="gain"
        @update:range="handleRangeUpdate"
        @progress="handleProgress"
        @play="handlePlay"
        @stop="handleStop"
      />

      <div class="flex items-center">
        <PlayControl
          class="flex-none"
          :class="{ 'opacity-60': disabled }"
          :playing="playing"
          :play-handler="handlePlayClick"
          @stop="handleStopClick"
        />
        <VolumeSlider class="mx-6 flex-[0_1_280px]" :value="gain" @update:value="handleGainUpdate" />
        <div class="flex-[1_1_0]" />
        <UIButton
          v-if="editing"
          v-radar="{ name: 'reset-edit-button', desc: 'Click to reset sound trim and volume edits' }"
          type="neutral"
          :disabled="disabled"
          @click="handleResetEdit"
        >
          {{ $t({ en: 'Reset', zh: '重置' }) }}
        </UIButton>
      </div>
    </template>
  </div>
</template>
