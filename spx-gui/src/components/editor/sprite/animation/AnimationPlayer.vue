<template>
  <div class="animation-player">
    <CheckerboardBackground class="background" />
    <div class="canvas" :style="canvasStyle"></div>
    <MuteSwitch v-if="audioElement" class="mute-switch" :muted="muted" @click="muted = !muted" />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Disposable } from '@/models/common/disposable'
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import type { Costume } from '@/models/costume'
import type { Sound } from '@/models/sound'
import CheckerboardBackground from '../CheckerboardBackground.vue'
import MuteSwitch from './MuteSwitch.vue'

const props = defineProps<{
  costumes: Costume[]
  sound: Sound | null
  duration: number
}>()

const [soundSrc, soundLoading] = useFileUrl(() => props.sound?.file)
const audioElement = ref<HTMLAudioElement | null>(null)
const muted = ref(true)
watch(muted, (muted) => {
  if (!audioElement.value) {
    return
  }
  audioElement.value.muted = muted
})

const currentFrameSrc = ref<string | null>(null)
const canvasStyle = computed(() => {
  if (!currentFrameSrc.value) return
  return {
    background: `url(${currentFrameSrc.value}) center center / contain no-repeat`
  }
})

const preloadAudio = async (src: string): Promise<HTMLAudioElement> => {
  const audio = new Audio()
  audio.src = src
  audio.load()
  await new Promise((resolve, reject) => {
    audio.oncanplaythrough = resolve
    audio.onerror = reject
  })
  return audio
}

const preloadFrames = async (costumeFiles: File[]) => {
  const disposable = new Disposable()
  try {
    const urls = await Promise.all(
      costumeFiles.map((costume) => costume.url((f) => disposable.addDisposer(f)))
    )

    const frames = await Promise.all([
      ...urls.map(async (url) => {
        const img = new Image()
        img.src = url
        await img.decode()
        return img
      })
    ])
    return {
      // We need to hold the frames in memory to avoid flickering
      frames,
      disposable
    }
  } catch (e) {
    disposable.dispose()
    throw e
  }
}

const startPlayingFrames = (frames: HTMLImageElement[], animationDuration: number) => {
  let currentFrameIndex = 0
  currentFrameSrc.value = frames[0].src
  const animationIntervalId = setInterval(
    () => {
      currentFrameIndex = (currentFrameIndex + 1) % frames.length
      currentFrameSrc.value = frames[currentFrameIndex].src
    },
    (animationDuration / frames.length) * 1000
  )

  return () => {
    clearInterval(animationIntervalId)
    currentFrameSrc.value = null
  }
}

const startPlayingAudio = (audioElement: HTMLAudioElement) => {
  const resetSound = () => {
    audioElement.currentTime = 0
    audioElement.play()
  }
  const soundIntervalId = setInterval(resetSound, props.duration * 1000)
  try {
    resetSound()
  } catch (e) {
    // We can get an error from `play()` if the sound is not loaded yet
    // or if the sound is not allowed to play
  }

  return () => {
    clearInterval(soundIntervalId)
    audioElement.pause()
  }
}

watch(
  () => ({
    soundSrc: soundSrc.value,
    soundLoading: soundLoading.value,
    costumeFiles: props.costumes.map((costume) => costume.img),
    animationDuration: props.duration
  }),
  async ({ soundSrc, soundLoading, costumeFiles, animationDuration }, old, onCleanup) => {
    if (!soundSrc || soundLoading) {
      audioElement.value?.pause()
      audioElement.value = null
    }
    if (soundLoading || !costumeFiles.length) {
      return
    }

    const disposable = new Disposable()
    let cancelled = false
    onCleanup(() => {
      cancelled = true
      disposable.dispose()
    })

    const { disposable: framesDisposable, frames } = await preloadFrames(costumeFiles)
    if (cancelled) {
      framesDisposable.dispose()
      return
    }
    disposable.addDisposer(framesDisposable.dispose)

    if (soundSrc) {
      const nextAudioElement = await preloadAudio(soundSrc)
      if (cancelled) {
        return
      }
      audioElement.value?.pause()
      audioElement.value = nextAudioElement
      nextAudioElement.muted = muted.value
    }

    disposable.addDisposer(startPlayingFrames(frames, animationDuration))
    if (soundSrc) {
      disposable.addDisposer(startPlayingAudio(audioElement.value!))
    }
  },
  { immediate: true }
)
</script>
<style scoped lang="scss">
.animation-player {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}
.background {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
.canvas {
  position: absolute;
  width: 100%;
  height: 100%;
}
.mute-switch {
  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
