<!-- Sound player for given audio src, based on `DumbSoundPlayer` -->

<template>
  <DumbSoundPlayer
    :playing="playing != null"
    :progress="playing?.progress ?? 0"
    :color="color"
    :play-handler="handlePlay"
    :loading="loading"
    :size="size"
    @stop="stop"
  />
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { registerPlayer } from '@/utils/player-registry'
import type { Color } from '@/components/ui'
import DumbSoundPlayer, { type Size } from '../common/PlayControl.vue'

const props = defineProps<{
  src: string | null
  color: Color
  size?: Size
}>()

type Playing = {
  /** Progress percentage, number in range `[0, 1]` */
  progress: number
  audio: HTMLAudioElement
}

const playing = ref<Playing | null>(null)
const registered = registerPlayer(stop)

async function handlePlay() {
  if (props.src == null) return
  playing.value = makePlaying(props.src)
  registered.onStart()
  await playing.value.audio.play()
}

function makePlaying(src: string) {
  const audio = new Audio(src)
  const p = reactive<Playing>({ audio, progress: 0 })
  audio.addEventListener('timeupdate', () => {
    p.progress = audio.currentTime / audio.duration
  })
  audio.addEventListener('error', (e) => {
    console.warn('audio error:', e)
    stop()
  })
  audio.addEventListener('ended', () => {
    // delay to make the animation more natural
    setTimeout(stop, 400)
  })
  return p
}

const loading = computed(() => props.src == null) // TODO: seeking?

function stop() {
  playing.value?.audio.pause()
  playing.value = null
  registered.onStopped()
}

onUnmounted(stop)
</script>
