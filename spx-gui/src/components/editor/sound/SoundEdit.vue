<template>
  <div class="sound-edit-content">
    <div class="sound-edit-content-top">
      <span class="text-sound">
        <NGradientText type="danger">
          <div class="sounds-hint">{{ $t('sounds.hint') }}</div>
        </NGradientText>
      </span>
    </div>
  </div>
  <div class="waveform-content">
    <div ref="waveformContainer" class="waveform-container"></div>
  </div>
  <div class="sound-edit-content-bottom">
    <div>
      <button @click="togglePlayPause()">
        <img v-if="!isPlaying" class="sound-icon" src="./icons/play.svg" />
        <img v-else class="sound-icon" src="./icons/pause.svg" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js'
import { ref, type Ref } from 'vue'
import { NGradientText } from 'naive-ui'
import { Sound } from '@/models/sound'
import { watchEffect } from 'vue'
import { onUnmounted } from 'vue'

const props = defineProps<{ asset: Sound | null }>()

const soundName = ref('')

const waveformContainer = ref<HTMLDivElement>()

let wavesurfer: WaveSurfer | null = null
let isPlaying: Ref<boolean> = ref(false)

const nameToMime = (name: string) => {
  if (name.endsWith('.webm')) {
    return 'audio/webm'
  }
  if (name.endsWith('.mp3')) {
    return 'audio/mp3'
  }
  return 'audio/wav'
}

watchEffect(
  async () => {
    if (wavesurfer) {
      wavesurfer.destroy()
    }
    if (!waveformContainer.value) {
      throw new Error('Waveform container is not ready')
    }

    wavesurfer = WaveSurfer.create({
      container: waveformContainer.value,
      waveColor: 'rgb(255,114,142)',
      progressColor: 'rgb(224,213,218)',
      cursorColor: 'rgb(229,29,100)',
      interact: false
    })

    if (!props.asset) {
      return
    }
    soundName.value = props.asset.name

    const mime = nameToMime(props.asset.file.name)
    const nativeFile = new File([await props.asset.file.arrayBuffer()], props.asset.name, {
      type: mime
    })
    wavesurfer.loadBlob(nativeFile)

    wavesurfer.on('play', () => {
      isPlaying.value = true
    })
    wavesurfer.on('pause', () => {
      isPlaying.value = false
    })
  },
  {
    flush: 'post'
  }
)

onUnmounted(() => {
  if (wavesurfer) {
    wavesurfer.destroy()
  }
})

const togglePlayPause = async () => {
  if (!wavesurfer) {
    return
  }
  await wavesurfer.playPause()
  isPlaying.value = wavesurfer.isPlaying()
}
</script>

<style scoped>
.vertical-dashed-line-long {
  border: none;
  border-left: 2px dashed #e53b65;
  height: 55px;
}

.vertical-dashed-line-short {
  border: none;
  border-left: 2px dashed #f0bfcb;
  height: 45px;
}

.sounds-hint {
  font-size: 20px;
}

.text-sound {
  margin-left: 5px;
  font-size: 20px;
}

.speed-change-container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 30px;
  height: 20px;
  border: #f9c3d3 dashed 2px;
  border-radius: 5px;
  color: #e53b65;
  cursor: pointer;
}

.speed-change-container-text {
  font-size: 13px;
}

.sound-edit-content-top {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 25px;
}

.sound-edit-content-top-input-sound-name {
  width: 100px;
  height: 36px;
  font-size: 10px;
}

.waveform-content {
  position: relative;
  z-index: 0;
  margin-top: 30px;
  margin-bottom: 30px;
}

.waveform-container {
  width: 600px;
  background-size: 10px 10px;
  background-image: linear-gradient(to right, rgba(244, 187, 187, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(247, 179, 179, 0.1) 1px, transparent 1px);
}

.sound-edit-content-bottom {
  margin-top: 15px;
  display: flex;
  gap: 13px;
}

.sound-icon-container {
  font-size: 18px;
  color: #474343;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sound-icon-container.disabled {
  color: grey;
}

.sound-icon-container button[disabled] {
  pointer-events: none;
}

.sound-icon {
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.sound-icon:hover {
  transform: scale(1.1);
}

.sound-icon-with-text {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition:
    transform 0.3s ease-in-out,
    color 0.3s ease-in-out;
}

.sound-icon-text {
  font-size: 13px;
}

.sound-icon-with-text:hover {
  transform: scale(1.2);
}

.sound-icon-with-text:active {
  filter: drop-shadow(0px 0px 10px rgb(242, 133, 133));
}

button {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

button:focus {
  outline: none;
}

button img {
  display: block;
}
</style>
