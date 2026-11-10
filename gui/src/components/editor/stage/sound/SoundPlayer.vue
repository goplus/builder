<!-- Sound player for given audio src, based on `PlayControl` -->

<template>
  <UIButton
    v-if="compact"
    v-radar="{
      name: playing == null ? 'Preview sound' : 'Stop sound',
      desc: 'Listen to this sound without selecting it'
    }"
    type="white"
    shape="square"
    class="border-transparent! bg-transparent!"
    :icon="playing == null ? 'play' : 'stop'"
    :title="$t(playing == null ? { en: 'Preview', zh: '试听' } : { en: 'Stop', zh: '停止' })"
    :loading="loading"
    @click.stop="toggle"
  />
  <PlayControl v-else :playing="playing" :play-handler="handlePlay" :loading="loading" :size="size" @stop="stop" />
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { registerPlayer } from '@/utils/player-registry'
import { useMessageHandle } from '@/utils/exception'
import { UIButton } from '@/components/ui'
import PlayControl, { type Playing, type Size } from '../../common/PlayControl.vue'

const props = defineProps<{
  src: string | null
  size?: Size
  compact?: boolean
}>()

type PlayingWithAudio = Playing & {
  audio: HTMLAudioElement
}

const playing = ref<PlayingWithAudio | null>(null)
const registered = registerPlayer(stop)
const toggle = useMessageHandle(() => (playing.value == null ? handlePlay() : stop()), {
  en: 'Failed to play',
  zh: '播放失败'
}).fn

async function handlePlay() {
  if (props.src == null) return
  playing.value = makePlaying(props.src)
  registered.onStart()
  await playing.value.audio.play()
}

function makePlaying(src: string) {
  const audio = new Audio(src)
  const p = reactive<PlayingWithAudio>({ audio, progress: 0 })
  audio.addEventListener('timeupdate', () => {
    p.progress = audio.currentTime / audio.duration
  })
  audio.addEventListener('error', (e) => {
    console.warn('audio error:', e)
    stop()
  })
  audio.addEventListener('ended', stop)
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
