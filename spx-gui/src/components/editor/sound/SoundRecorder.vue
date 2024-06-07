<template>
  <div class="container">
    <div class="recorder-waveform-container">
      <!-- We use v-if to reset the component as there are issues re-recording. -->
      <WavesurferWithRange
        v-if="recording || audioBlob"
        ref="wavesurferRef"
        v-model:range="audioRange"
        :gain="gain"
        @init="handleWaveSurferInit"
      />
      <div v-if="!recording && !audioBlob" class="recorder-waveform-overlay">
        {{
          $t({
            en: 'Begin recording by clicking the button below',
            zh: '点击下方按钮开始录音'
          })
        }}
      </div>
    </div>
    <div v-if="!recording && audioBlob" class="volume-slider-container">
      <VolumeSlider :value="gain" @update:value="handleUpdateVolume" />
    </div>
    <div class="button-container">
      <div v-if="!recording && !audioBlob" class="icon-button">
        <UIIconButton icon="microphone" type="danger" @click="recording = true" />
        <span>
          {{
            $t({
              en: 'Record',
              zh: '录音'
            })
          }}
        </span>
      </div>
      <div v-else-if="recording" class="icon-button">
        <UIIconButton icon="stop" type="danger" @click="stopRecording" />
        <span>
          {{
            $t({
              en: 'Stop',
              zh: '停止'
            })
          }}
        </span>
      </div>
      <template v-else>
        <div class="icon-button">
          <div class="icon-button-wrapper">
            <UIIconButton icon="reload" type="secondary" @click="resetRecording" />
          </div>

          <span>
            {{
              $t({
                en: 'Re-record',
                zh: '重新录音'
              })
            }}
          </span>
        </div>
        <div class="icon-button">
          <UIIconButton icon="play" type="info" size="large" @click="wavesurferRef?.play()" />
          <span>
            {{
              $t({
                en: 'Play',
                zh: '播放'
              })
            }}
          </span>
        </div>
        <div class="icon-button">
          <div class="icon-button-wrapper">
            <UIIconButton icon="check" type="success" @click="saveRecording" />
          </div>
          <span>
            {{
              $t({
                en: 'Save',
                zh: '保存'
              })
            }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineEmits, ref } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import dayjs from 'dayjs'
import { fromBlob } from '@/models/common/file'
import { Sound } from '@/models/sound'
import { UIIconButton } from '@/components/ui'
import { RecordPlugin } from '@/utils/wavesurfer-record'
import VolumeSlider from './VolumeSlider.vue'
import WavesurferWithRange from './WavesurferWithRange.vue'
import type WaveSurfer from 'wavesurfer.js'

const emit = defineEmits<{
  saved: [Sound]
  recordStarted: []
}>()

const recording = ref(false)
const playing = ref(false)

const audioBlob = ref<Blob | null>(null)
let recordPlugin: RecordPlugin

const wavesurferRef = ref<InstanceType<typeof WavesurferWithRange> | null>(null)

const audioRange = ref({ left: 0, right: 1 })
const gain = ref(1)

const editorCtx = useEditorCtx()

const handleUpdateVolume = (v: number) => {
  gain.value = v
}

const handleWaveSurferInit = (wavesurfer: WaveSurfer) => {
  recordPlugin = wavesurfer.registerPlugin(RecordPlugin.create())

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

  const startRecording = async () => {
    emit('recordStarted')

    resetRecording()

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

  void startRecording()
}

const stopRecording = () => {
  recordPlugin.stopRecording()
}

const saveRecording = async () => {
  if (!wavesurferRef.value) return
  const wav = await wavesurferRef.value.exportWav()

  const file = fromBlob(`Recording_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}.webm`, wav)
  const sound = await Sound.create('recording', file)
  const action = { name: { en: 'Add recording', zh: '添加录音' } }
  await editorCtx.project.history.doAction(action, () => editorCtx.project.addSound(sound))
  emit('saved', sound)
}

const resetRecording = () => {
  audioBlob.value = null
  wavesurferRef.value?.empty()
  gain.value = 1
  audioRange.value = { left: 0, right: 1 }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
}

.recorder-waveform-container {
  background-color: var(--ui-color-grey-300);
  border-radius: var(--ui-border-radius-2);
  height: 160px;
  position: relative;
  overflow: hidden;
}

.recorder-waveform-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--ui-color-grey-800);
  white-space: nowrap;
}

.recorder-waveform {
  height: 160px;
  padding: 0 16px;
}

.hidden {
  opacity: 0;
}

.icon-button-wrapper {
  display: flex;
  align-items: center;
  height: 56px;
}

.button-container {
  display: flex;
  margin-top: 32px;
  margin-bottom: 8px;
  gap: 40px;
  justify-content: center;
}

.icon-button {
  display: flex;
  gap: 8px;
  flex-direction: column;
  font-size: 14px;
  align-items: center;
}
.volume-slider-container {
  padding-top: 24px;
  margin-bottom: -8px;
}
</style>
