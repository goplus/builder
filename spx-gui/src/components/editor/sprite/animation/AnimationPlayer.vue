<template>
  <div :style="divStyle" class="animation-player-inner">
    <MuteSwitch
      class="mute-switch"
      :state="soundElement ? (soundElement.muted ? 'muted' : 'normal') : 'disabled'"
      @click="soundElement && (soundElement.muted = !soundElement.muted)"
    />
  </div>
</template>
<script setup lang="ts">
import type { Animation } from '@/models/animation'
import type { Disposer } from '@/models/common/disposable'
import { computed, ref, watchEffect } from 'vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { useFileUrl } from '@/utils/file'
import MuteSwitch from './MuteSwitch.vue'

const props = defineProps<{
  animation: Animation
}>()

const frameSrcList = ref<string[]>([])
watchEffect(async (onCleanup) => {
  const disposers: Disposer[] = []
  onCleanup(() => {
    disposers.forEach((f) => f())
  })

  const urls = await Promise.all(
    props.animation.costumes.map((costume) =>
      costume.img.url((f) => {
        disposers.push(f)
      })
    )
  )
  frameSrcList.value = urls
})

const editorCtx = useEditorCtx()

const currentSound = computed(() => {
  const sound = editorCtx.project.sounds.find((sound) => sound.name === props.animation.sound)
  return sound
})
const [soundSrc] = useFileUrl(() => currentSound.value?.file)
const soundElement = ref<HTMLAudioElement | null>()
watchEffect(() => {
  soundElement.value?.pause()
  if (!soundSrc.value) {
    soundElement.value = null
    return
  }

  soundElement.value = new Audio(soundSrc.value)
  soundElement.value.load()
  soundElement.value.muted = true
})

const currentFrameIndex = ref(0)

const frameInterval = computed(() => {
  if (frameSrcList.value.length === 0) return 0
  return (props.animation.duration / frameSrcList.value.length) * 1000 // convert to milliseconds
})

const divStyle = computed(() => ({
  background: `url(${frameSrcList.value[currentFrameIndex.value]}) center center / contain no-repeat`
}))

watchEffect((onCleanup) => {
  if (frameSrcList.value.length === 0) return

  const animationIntervalId = setInterval(() => {
    currentFrameIndex.value = (currentFrameIndex.value + 1) % frameSrcList.value.length
  }, frameInterval.value)

  onCleanup(() => {
    clearInterval(animationIntervalId)
    currentFrameIndex.value = 0
  })
})

watchEffect((onCleanup) => {
  const resetSound = () => {
    if (!soundElement.value) return
    soundElement.value.currentTime = 0
    soundElement.value.play()
  }
  const soundIntervalId = setInterval(resetSound, props.animation.duration * 1000)
  try {
    resetSound()
  } catch (e) {
    // We can get an error from `play()` if the sound is not loaded yet
    // or if the sound is not allowed to play
  }

  onCleanup(() => {
    clearInterval(soundIntervalId)
    soundElement.value?.pause()
  })
})
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
