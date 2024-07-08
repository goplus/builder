<template>
  <div :style="divStyle" class="animation-player-inner">
    <MuteSwitch v-if="audioElement" class="mute-switch" :muted="muted" @click="muted = !muted" />
  </div>
</template>
<script setup lang="ts">
import type { Animation } from '@/models/animation'
import { Disposble } from '@/models/common/disposable'
import { computed, ref, watch } from 'vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useFileUrl } from '@/utils/file'
import MuteSwitch from './MuteSwitch.vue'
import type { File } from '@/models/common/file'

const props = defineProps<{
  animation: Animation
}>()

const editorCtx = useEditorCtx()

const soundFile = computed(
  () => editorCtx.project.sounds.find((sound) => sound.name === props.animation.sound)?.file
)
const [soundSrc, soundLoading] = useFileUrl(() => soundFile.value)
const audioElement = ref<HTMLAudioElement | null>(null)
const muted = ref(true)
watch(muted, (muted) => {
  if (!audioElement.value) {
    return
  }
  audioElement.value.muted = muted
})

const currentFrameSrc = ref<string | null>(null)
const divStyle = computed(() => {
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
  const disposer = new Disposble()
  try {
    const urls = await Promise.all(
      costumeFiles.map((costume) => costume.url((f) => disposer.addDisposer(f)))
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
      disposer
    }
  } catch (e) {
    disposer.dispose()
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
  const soundIntervalId = setInterval(resetSound, props.animation.duration * 1000)
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
    costumeFiles: props.animation.costumes.map((costume) => costume.img),
    animationDuration: props.animation.duration
  }),
  async ({ soundSrc, soundLoading, costumeFiles, animationDuration }, old, onCleanup) => {
    if (soundLoading || !costumeFiles.length) {
      return
    }

    const disposable = new Disposble()
    let cancelled = false
    onCleanup(() => {
      cancelled = true
      disposable.dispose()
    })

    const { disposer, frames } = await preloadFrames(costumeFiles)
    if (cancelled) {
      disposer.dispose()
      return
    }
    disposable.addDisposer(disposer.dispose)

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
.animation-player-inner {
  position: relative;
  .mute-switch {
    position: absolute;
    top: 12px;
    right: 12px;
  }
}
</style>
