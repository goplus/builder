<template>
  <div class="video-recorder">
    <Transition name="slide-fade" mode="out-in" appear>
      <div v-if="cameraActive" class="recorder-content record">
        <!-- seconds -->
        <div v-if="recording" class="recording-time">
          {{ $t({ en: 'Recording', zh: '录制中' }) }}: {{ recordingTime }}s
        </div>
        <video ref="liveVideoRef" autoplay class="recorder-video record"></video>

        <div class="control-btn">
          <UIButton size="large" @click="recording ? stopRecording() : startRecording()">
            <NIcon size="large">
              <StopCircleOutlined v-if="recording" />
              <SlowMotionVideoOutlined v-else />
            </NIcon>
            {{
              recording
                ? $t({ en: 'stop recording', zh: '停止录制' })
                : $t({ en: 'start recording', zh: '开始录制' })
            }}
          </UIButton>
        </div>
      </div>
      <div v-else-if="recordedBlobUrl" class="recorder-content playback">
        <video
          ref="recordedVideo"
          controls
          :src="recordedBlobUrl"
          class="recorder-video playback"
        ></video>
        <div class="control-btn">
          <UIButton size="large" @click="resetRecorder">
            <NIcon size="large">
              <ArrowBackOutlined />
            </NIcon>
            {{ $t({ en: 'Return', zh: '返回' }) }}
          </UIButton>
          <UIButton size="large" @click="generateAnimation">
            <NIcon size="large">
              <RunCircleOutlined />
            </NIcon>
            {{ $t({ en: 'Generate', zh: '生成动画' }) }}
          </UIButton>
          <UIButton size="large" @click="downloadRecordedVideo">
            <NIcon size="large">
              <FileDownloadOutlined />
            </NIcon>
            {{ $t({ en: 'Export', zh: '导出' }) }}
          </UIButton>
        </div>
      </div>
    </Transition>

    <Transition name="slide-fade" mode="out-in" appear> </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, type Ref, nextTick } from 'vue'
import { UIButton } from '@/components/ui'
import { NIcon } from 'naive-ui'
import {
  ArrowBackOutlined,
  FileDownloadOutlined,
  RunCircleOutlined,
  SlowMotionVideoOutlined,
  StopCircleOutlined,
  VideocamOffOutlined,
  VideocamOutlined
} from '@vicons/material'

let mediaStream: MediaStream
let mediaRecorder: MediaRecorder
let recordedChunks: Blob[] = []
const cameraActive = ref(false)
const recording = ref(false)
const recordingStartedAt = ref<number | null>(null)
const recordingTime = ref<number | null>(null)
const recordedBlobUrl = ref<string | null>(null)
const liveVideoRef = ref<HTMLVideoElement | null>(null)
const recordedVideoRef = ref<HTMLVideoElement | null>(null)

const startCamera = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false // we don't need audio
    })
    cameraActive.value = true
    await nextTick()

    if (liveVideoRef.value) {
      liveVideoRef.value.srcObject = mediaStream
    }
  } catch (error) {
    console.error('无法访问摄像头:', error)
  }
}

const stopCamera = () => {
  if (!mediaStream) {
    return
  }
  mediaStream.getTracks().forEach((track) => track.stop())
  cameraActive.value = false
}

const startRecording = () => {
  if (!mediaStream) {
    return
  }
  recordedChunks = []
  mediaRecorder = new MediaRecorder(mediaStream)

  mediaRecorder.ondataavailable = handleRecorderData
  mediaRecorder.onstop = handleRecorderStop

  mediaRecorder.start()
  recording.value = true

  recordingStartedAt.value = Date.now()
  incrementRecordingTime()
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    recording.value = false
  }
}

const resetRecorder = () => {
  recordedBlobUrl.value = null
  startCamera()
}

const incrementRecordingTime = () => {
  if (recordingStartedAt.value) {
    recordingTime.value = Math.floor((Date.now() - recordingStartedAt.value) / 1000)
  }
  if (recording.value) {
    requestAnimationFrame(incrementRecordingTime)
  }
}

const handleRecorderData = (event: BlobEvent) => {
  if (event.data.size > 0) {
    recordedChunks.push(event.data)
  }
}

const handleRecorderStop = () => {
  stopCamera()
  const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' })
  recordedBlobUrl.value = URL.createObjectURL(recordedBlob)
  if (recordedVideoRef.value) {
    recordedVideoRef.value.src = recordedBlobUrl.value
  }
}

const generateAnimation = () => {
  // TODO: send recordedBlob to server to generate animation
}

const downloadRecordedVideo = () => {
  if (recordedBlobUrl.value) {
    const a = document.createElement('a')
    a.href = recordedBlobUrl.value
    a.download = 'recorded-video.webm'
    a.click()
  }
}

onMounted(() => {
  startCamera()
})

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<style scoped>
.video-recorder {
  text-align: center;
  min-height: 416px;
  position: relative;
}

.recorder-video {
  width: 100%;
  max-width: 600px;
  border-radius: var(--ui-border-radius-1);
}

.recording-time {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 7rem;
  border-radius: var(--ui-border-radius-1);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px;
}

.control-btn {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
button {
  margin: 5px;
}
</style>
