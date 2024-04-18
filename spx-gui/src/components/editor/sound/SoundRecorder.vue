<template>
  <div class="container">
    <div class="recorder-waveform-container">
      <div
        ref="waveformContainer"
        :class="['recorder-waveform', { hidden: !recording && !audioBlob }]"
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
    <div class="button-container">
      <div v-if="!recording && !audioBlob" class="icon-button">
        <UIIconButton icon="microphone" type="danger" @click="startRecording" />
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
          <UIIconButton icon="play" type="info" size="large" @click="wavesurfer.playPause()" />
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
import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'
import { defineEmits, onMounted, ref } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { fromBlob } from '@/models/common/file'
import { Sound } from '@/models/sound'
import { purple } from '@/components/ui/tokens/colors'
import { UIIconButton } from '@/components/ui'

const emit = defineEmits<{
  saved: []
  recordStarted: []
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
    interact: false,
    container: waveformContainer.value,
    waveColor: purple[400],
    progressColor: purple[300] + '80',
    height: 160,
    cursorWidth: 4,
    normalize: true,
    renderFunction: (peaks: (Float32Array | number[])[], ctx: CanvasRenderingContext2D): void => {
      const smoothAndDrawChannel = (channel: Float32Array, vScale: number) => {
        const { width, height } = ctx.canvas
        const halfHeight = height / 2
        const numPoints = Math.floor(width / 5)
        const blockSize = Math.floor(channel.length / numPoints)
        const smoothedData = new Float32Array(numPoints)

        // Smooth the data by averaging blocks
        for (let i = 0; i < numPoints; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channel[i * blockSize + j])
          }
          smoothedData[i] = sum / blockSize
        }

        // Draw with bezier curves
        ctx.beginPath()
        ctx.moveTo(0, halfHeight)

        for (let i = 1; i < smoothedData.length; i++) {
          const prevX = (i - 1) * (width / numPoints)
          const currX = i * (width / numPoints)
          const midX = (prevX + currX) / 2
          const prevY = halfHeight + smoothedData[i - 1] * halfHeight * vScale
          const currY = halfHeight + smoothedData[i] * halfHeight * vScale

          // Use a quadratic bezier curve to the middle of the interval for a smoother line
          ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + currY) / 2)
          ctx.quadraticCurveTo(midX, (prevY + currY) / 2, currX, currY)
        }

        ctx.lineTo(width, halfHeight)
        ctx.strokeStyle = purple[400]
        ctx.stroke()
        ctx.closePath()
        ctx.fillStyle = purple[400]
        ctx.fill()
      }

      const channel = Array.isArray(peaks[0]) ? new Float32Array(peaks[0] as number[]) : peaks[0]

      // Only one channel is assumed, render it twice (mirrored)
      smoothAndDrawChannel(channel, 5) // Upper part
      smoothAndDrawChannel(channel, -5) // Lower part (mirrored)
    }
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
  emit('recordStarted')
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

const saveRecording = async () => {
  const soundName = `Recording ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`
  const file = fromBlob(`${soundName}.webm`, audioBlob.value!)
  const sound = new Sound(soundName, file)
  editorCtx.project.addSound(sound)
  closeRecorder()
}

const resetRecording = () => {
  audioBlob.value = null
  wavesurfer.empty()
}

const closeRecorder = () => {
  emit('saved')
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
  width: 99%;
  height: 129px;
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
  margin-top: 20px;
  gap: 40px;
  justify-content: center;
}

.icon-button {
  display: flex;
  gap: 12px;
  flex-direction: column;
  font-size: 14px;
  align-items: center;
}
</style>
