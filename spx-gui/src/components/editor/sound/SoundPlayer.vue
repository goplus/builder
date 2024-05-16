<!-- Sound player for given audio src, based on `DumbSoundPlayer` -->

<template>
  <DumbSoundPlayer
    :playing="playing != null"
    :progress="playing?.progress ?? 0"
    :color="color"
    :play-handler="handlePlay"
    :loading="loading"
    @stop="handleStop"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import DumbSoundPlayer from './DumbSoundPlayer.vue'
import type { Color } from '@/components/ui/tokens/colors'

const props = defineProps<{
  src: string | null
  color: Color
}>()

type Playing = {
  progress: number // percent
  audio: HTMLAudioElement
}

const playing = ref<Playing | null>(null)

async function handlePlay() {
  if (props.src == null) return
  playing.value = makePlaying(props.src)
  await playing.value.audio.play()
}

function makePlaying(src: string) {
  const audio = new Audio(src)
  const p = reactive({ audio, progress: 0 })
  audio.addEventListener('timeupdate', () => {
    p.progress = Math.round((audio.currentTime / audio.duration) * 100)
  })
  audio.addEventListener('error', (e) => {
    console.warn('audio error:', e)
    handleStop()
  })
  audio.addEventListener('ended', () => {
    // delay to make the animation more natural
    setTimeout(handleStop, 400)
  })
  return p
}

const loading = computed(() => props.src == null) // TODO: seeking?

function handleStop() {
  playing.value?.audio.pause()
  playing.value = null
}
</script>
