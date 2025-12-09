<template>
  <div class="container">
    <div class="recorder-waveform-container">
      <WaveformRecorder
        v-if="recordingState === 'recording' || recordingState === 'recorded'"
        ref="waveformRecorderRef"
        :range="audioRange"
        :gain="gain"
        @update:range="recordingState === 'recorded' && (audioRange = $event)"
        @record-started="handleRecordStarted"
        @record-stopped="recordingState = 'recorded'"
      />
      <div v-if="recordingState === 'yetStarted'" class="recorder-waveform-overlay">
        {{
          $t({
            en: 'Begin recording by clicking the button below',
            zh: '点击下方按钮开始录音'
          })
        }}
      </div>
    </div>
    <div v-if="recordingState === 'recorded'" class="volume-slider-container">
      <VolumeSlider :value="gain" @update:value="handleGainUpdate" />
    </div>
    <div class="button-container">
      <div v-if="recordingState === 'yetStarted'" class="icon-button">
        <UIButton shape="circle" size="large" icon="microphone" color="danger" @click="recordingState = 'recording'" />
        <span>
          {{
            $t({
              en: 'Record',
              zh: '录音'
            })
          }}
        </span>
      </div>
      <div v-else-if="recordingState === 'recording'" class="icon-button">
        <UIButton shape="circle" size="large" icon="stop" color="danger" @click="stopRecording" />
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
            <UIButton shape="circle" size="large" icon="reload" color="blue" @click="resetRecording" />
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
          <UIButton
            style="width: 56px; height: 56px"
            shape="circle"
            size="large"
            color="purple"
            @click="waveformRecorderRef?.startPlayback()"
          >
            <template #icon>
              <UIIcon type="play" style="width: 28px; height: 28px" />
            </template>
          </UIButton>
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
            <UIButton shape="circle" size="large" icon="check" color="success" @click="saveRecording" />
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
import { ref } from 'vue'
import dayjs from 'dayjs'
import { fromBlob } from '@/models/common/file'
import { Sound } from '@/models/sound'
import type { Project } from '@/models/project'
import { UIButton, UIIcon } from '@/components/ui'
import VolumeSlider from './VolumeSlider.vue'
import { WaveformRecorder } from './waveform'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  saved: [Sound]
  recordStarted: []
}>()

const recordingState = ref<'yetStarted' | 'recording' | 'recorded'>('yetStarted')

const waveformRecorderRef = ref<InstanceType<typeof WaveformRecorder> | null>(null)

const audioRange = ref({ left: 0, right: 1 })
const gain = ref(1)

const handleGainUpdate = (v: number) => {
  gain.value = v
  waveformRecorderRef.value?.startPlayback()
}

const handleRecordStarted = () => {
  recordingState.value = 'recording'
  emit('recordStarted')
}

const stopRecording = () => {
  waveformRecorderRef.value?.stopRecording()
}

const saveRecording = async () => {
  if (!waveformRecorderRef.value || recordingState.value !== 'recorded') return
  const wav = await waveformRecorderRef.value.exportWav()

  const file = fromBlob(`Recording_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}.wav`, wav)
  const sound = await Sound.create('recording', file)
  const action = { name: { en: 'Add recording', zh: '添加录音' } }
  await props.project.history.doAction(action, () => props.project.addSound(sound))
  emit('saved', sound)
}

const resetRecording = () => {
  recordingState.value = 'yetStarted'
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
