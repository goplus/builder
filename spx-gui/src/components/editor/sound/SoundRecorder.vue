<template>
  <!-- TODO: Refactor modal to use Naive UI -->
  <div class="modal">
    <div class="modal-content">
      <div class="close-button" @click="closeRecorder">
        <span class="close-button-text"> × </span>
      </div>
      <div class="recorder-waveform-container">
        <div ref="waveformContainer" class="recorder-waveform"></div>
      </div>
      <div class="name-input-container">
        <span class="name-input-hint"> {{ $t('sounds.soundName') }} </span>
      </div>
      <div v-if="!recording && audioBlob" @click="wavesurfer.playPause()">
        <NButton>{{ playing ? 'Pause' : 'Play' }}</NButton>
      </div>
      <div class="button-container">
        <NButton @click="handleRecordingClick">
          {{ recording ? $t('sounds.stopRecording') : $t('sounds.startRecording') }}
        </NButton>
        <NButton :disabled="!audioBlob || recording" @click="saveRecording">
          {{ $t('sounds.save') }}
        </NButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'
import { defineEmits, onMounted, ref } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { onUnmounted } from 'vue'
import { NButton } from 'naive-ui'
import dayjs from 'dayjs'
import { fromBlob } from '@/models/common/file'
import { Sound } from '@/models/sound'

const emits = defineEmits<{
  close: []
}>()

const recording = ref(false)
const playing = ref(false)

const audioBlob = ref<Blob | null>(null)
let wavesurfer: WaveSurfer
let recordPlugin: RecordPlugin
const waveformContainer = ref(null)

const editorCtx = useEditorCtx()

onMounted(() => {
  initWaveSurfer()
})

onUnmounted(() => {
  if (wavesurfer) {
    wavesurfer.destroy()
  }
})

const initWaveSurfer = () => {
  if (!waveformContainer.value) {
    throw new Error('Waveform container not initialized')
  }
  if (wavesurfer) {
    wavesurfer.destroy()
  }
  wavesurfer = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: 'rgb(255,114,142)',
    progressColor: 'rgb(224,213,218)',
    cursorColor: 'rgb(229,29,100)'
  })

  recordPlugin = wavesurfer.registerPlugin(
    RecordPlugin.create({
      scrollingWaveform: true
    })
  )

  wavesurfer.on('play', () => {
    playing.value = true
  })
  wavesurfer.on('pause', () => {
    playing.value = false
  })

  recordPlugin.on('record-end', (blob) => {
    recording.value = false
    audioBlob.value = blob
  })
  recordPlugin.on('record-start', () => {
    recording.value = true
  })
}

const startRecording = async () => {
  const devices = await RecordPlugin.getAvailableAudioDevices()
  if (devices.length === 0) {
    alert('No audio input devices available. TODO: i18n, use message hook?')
    return
  }
  const device = devices[0]

  await recordPlugin.startRecording({
    deviceId: device.deviceId
  })
}

const stopRecording = () => {
  recordPlugin.stopRecording()
}

const handleRecordingClick = () => {
  if (recording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const saveRecording = async () => {
  const soundName = `Recording ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
  const file = fromBlob(`${soundName}.webm`, audioBlob.value!)
  const sound = new Sound(soundName, file)
  editorCtx.project.addSound(sound)
  closeRecorder()
}

const closeRecorder = () => {
  emits('close')
}
</script>

<style lang="scss" scoped>
.modal {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  z-index: 10001;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
  display: flex;
  flex-direction: column;
  background-color: #fefefe;
  padding: 20px;
  width: 80%;
  max-width: 500px;
  min-height: 300px;
  max-height: 90vh;
  border-radius: 15px;
}

.close-button {
  color: #aaaaaa;
  float: right;
  position: fixed;
  align-self: flex-end;
  margin-top: -30px;
}
.close-button:hover,
.close-button:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
}
.close-button-text {
  font-size: 50px;
}

.recorder-waveform-container {
  border: 1px dashed #b99696;
  margin-top: 30px;
  padding-top: 1px;
}

.recorder-waveform {
  width: 99%;
  height: 129px;
}

.name-input-container {
  margin-top: 20px;
  margin-bottom: 20px;
  width: 50%;
}

.name-input-hint {
  color: gray;
  margin-right: 5px;
}

.button-container {
  display: flex;
  margin-top: 20px;
  gap: 16px;
}
</style>
