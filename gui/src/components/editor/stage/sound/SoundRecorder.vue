<template>
  <div class="flex flex-col">
    <div class="relative h-40 overflow-hidden rounded-md bg-grey-300">
      <WaveformRecorder
        v-if="recordingState === 'recording' || recordingState === 'recorded'"
        ref="recorderRef"
        :range="audioRange"
        :gain="gain"
        @update:range="recordingState === 'recorded' && (audioRange = $event)"
        @record-started="handleRecordStarted"
        @record-stopped="recordingState = 'recorded'"
        @playback-started="handlePlaying"
        @playback-stopped="handlePlayingStopped"
        @playback-progress="handlePlayingProgress"
      />
      <div
        v-if="recordingState === 'yetStarted'"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-grey-800"
      >
        {{
          $t({
            en: 'Begin recording by clicking the button below',
            zh: '点击下方按钮开始录音'
          })
        }}
      </div>
    </div>
    <div v-if="recordingState === 'recorded'" class="-mb-2 pt-6">
      <VolumeSlider :value="gain" @update:value="handleGainUpdate" />
    </div>
    <div class="mb-2 mt-8 flex justify-center gap-10">
      <div v-if="recordingState === 'yetStarted'" class="flex flex-col items-center gap-2 text-base">
        <UIButton shape="circle" size="large" icon="microphone" type="red" @click="recordingState = 'recording'" />
        <span>
          {{
            $t({
              en: 'Record',
              zh: '录音'
            })
          }}
        </span>
      </div>
      <div v-else-if="recordingState === 'recording'" class="flex flex-col items-center gap-2 text-base">
        <UIButton shape="circle" size="large" icon="stop" type="red" @click="stopRecording" />
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
        <div class="w-14 flex flex-col items-center gap-2 text-base">
          <div class="h-14 flex items-center">
            <UIButton shape="circle" size="large" icon="reload" type="red" @click="resetRecording" />
          </div>
          <span class="whitespace-nowrap">
            {{ $t({ en: 'Re-record', zh: '重新录音' }) }}
          </span>
        </div>
        <div class="w-14 flex flex-col items-center gap-2 text-base">
          <div class="h-14 flex items-center">
            <PlayControl size="large" :playing="playing" :play-handler="handlePlay" @stop="handleStopPlaying" />
          </div>
          <span class="whitespace-nowrap">
            {{ $t({ en: 'Play', zh: '播放' }) }}
          </span>
        </div>
        <div class="w-14 flex flex-col items-center gap-2 text-base">
          <div class="h-14 flex items-center">
            <UIButton shape="circle" size="large" icon="check" type="green" @click="saveRecording" />
          </div>
          <span class="whitespace-nowrap">
            {{ $t({ en: 'Save', zh: '保存' }) }}
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
import { Sound } from '@/models/spx/sound'
import type { SpxProject } from '@/models/spx/project'
import { UIButton } from '@/components/ui'
import PlayControl, { type Playing } from '../../common/PlayControl.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import VolumeSlider from './VolumeSlider.vue'
import { WaveformRecorder } from './waveform'

const props = defineProps<{
  project: SpxProject
}>()

const emit = defineEmits<{
  saved: [Sound]
  recordStarted: []
}>()

const editorCtx = useEditorCtx()

const recordingState = ref<'yetStarted' | 'recording' | 'recorded'>('yetStarted')

const recorderRef = ref<InstanceType<typeof WaveformRecorder> | null>(null)

const audioRange = ref({ left: 0, right: 1 })
const gain = ref(1)

const handleGainUpdate = (v: number) => {
  gain.value = v
  recorderRef.value?.startPlayback()
}

const handleRecordStarted = () => {
  recordingState.value = 'recording'
  emit('recordStarted')
}

const stopRecording = () => {
  recorderRef.value?.stopRecording()
}

const playing = ref<Playing | null>(null)

async function handlePlay() {
  return recorderRef.value?.startPlayback()
}

function handlePlaying() {
  playing.value = { progress: 0 }
}

function handleStopPlaying() {
  recorderRef.value?.stopPlayback()
}

function handlePlayingStopped() {
  playing.value = null
}

function handlePlayingProgress(value: number) {
  if (playing.value != null) playing.value.progress = value
}

const saveRecording = async () => {
  if (!recorderRef.value || recordingState.value !== 'recorded') return
  const wav = await recorderRef.value.exportWav()

  const file = fromBlob(`Recording_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}.wav`, wav)
  const sound = await Sound.create('recording', file)
  const action = { name: { en: 'Add recording', zh: '添加录音' } }
  await editorCtx.state.history.doAction(action, () => props.project.addSound(sound))
  emit('saved', sound)
}

const resetRecording = () => {
  recordingState.value = 'yetStarted'
  gain.value = 1
  audioRange.value = { left: 0, right: 1 }
}
</script>
