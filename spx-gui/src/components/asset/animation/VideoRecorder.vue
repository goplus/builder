<template>
  <div class="video-recorder">
    <div v-if="requestingPermission" class="recorder-content request-permission">
      <p>
        {{
          $t({
            en: 'Please allow the camera permission to start recording',
            zh: '请允许访问摄像头以开始录制'
          })
        }}
      </p>
    </div>
    <div v-else-if="permissionDeniedMessage" class="recorder-content permission-denied">
      <p>{{ permissionDeniedMessage }}</p>
      <UIButton size="large" @click="startCamera">
        <NIcon size="large">
          <RefreshOutlined />
        </NIcon>
        {{ $t({ en: 'Retry', zh: '重试' }) }}
      </UIButton>
    </div>
    <Transition name="slide-fade" mode="out-in" appear>
      <div v-if="cameraActive" class="recorder-content record">
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { UIButton } from '@/components/ui'
import { NIcon } from 'naive-ui'
import {
  ArrowBackOutlined,
  FileDownloadOutlined,
  RefreshOutlined,
  RunCircleOutlined,
  SlowMotionVideoOutlined,
  StopCircleOutlined
} from '@vicons/material'
import { useI18n } from '@/utils/i18n'
import { fromBlob } from '@/models/common/file'
import { saveFiles } from '@/models/common/cloud'
import { getWebUrl } from '@/apis/util'
import { ExtractMotionTask } from '@/models/aigc'

let mediaStream: MediaStream
let mediaRecorder: MediaRecorder
let recordedChunks: Blob[] = []
const requestingPermission = ref(false)
const permissionDeniedMessage = ref<string | null>(null)
const cameraActive = ref(false)
const recording = ref(false)
const recordingStartedAt = ref<number | null>(null)
const recordingTime = ref<number | null>(null)
let recordedBlob: Blob | null = null
const recordedBlobUrl = ref<string | null>(null)
const liveVideoRef = ref<HTMLVideoElement | null>(null)
const recordedVideoRef = ref<HTMLVideoElement | null>(null)

const { t } = useI18n()

const startCamera = async () => {
  requestingPermission.value = true
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false // we don't need audio
    })
    .then(async (media) => {
      requestingPermission.value = false
      permissionDeniedMessage.value = null
      mediaStream = media
      cameraActive.value = true
      await nextTick()

      if (liveVideoRef.value) {
        liveVideoRef.value.srcObject = mediaStream
      }
    })
    .catch((error: DOMException) => {
      requestingPermission.value = false
      switch (error.name) {
        case 'NotAllowedError':
          permissionDeniedMessage.value = t({
            en: 'Permission denied, please allow the camera permission in your browser settings to start recording',
            zh: '权限被拒绝，请在浏览器设置中允许访问摄像头以开始录制'
          })
          break
        case 'NotFoundError':
          permissionDeniedMessage.value = t({
            en: 'No camera found, please make sure you have a camera connected to your device',
            zh: '未找到摄像头，请确保您的设备连接了摄像头'
          })
          break
        default:
          permissionDeniedMessage.value = t({
            en: `Failed to start camera, please try again later. ${error.name}: ${error.message}`,
            zh: `无法启动摄像头，请稍后再试。${error.name}: ${error.message}`
          })
      }
    })
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
  if (recordedBlobUrl.value) {
    URL.revokeObjectURL(recordedBlobUrl.value)
  }
  recordedChunks = []
  recordedBlob = null
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
  recordedBlob = new Blob(recordedChunks, { type: 'video/webm' })
  recordedBlobUrl.value = URL.createObjectURL(recordedBlob)
  if (recordedVideoRef.value) {
    recordedVideoRef.value.src = recordedBlobUrl.value
  }
}

const generateAnimation = async () => {
  if (!recordedBlob) {
    return
  }
  const file = fromBlob('recorded-video.webm', recordedBlob)
  const { fileCollection } = await saveFiles({'recorded-video.webm': file})
  const videoKodoUrl = fileCollection['recorded-video.webm']
  const videoWebUrl = await getWebUrl(videoKodoUrl)

  const extractMotionTask = new ExtractMotionTask({
    videoUrl: videoWebUrl,
    callbackUrl: '',
  })

  extractMotionTask.start()

  return new Promise<string>((resolve, reject) => {
    extractMotionTask.addEventListener('AIGCFinished', () => {
      const result = extractMotionTask.result?.resultUrl
      if (!result) {
        reject(new Error('Failed to extract motion'))
      }
      else {
        resolve(result)
      }
    })
  })
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
  display: flex;
  flex-direction: column;
}

.recorder-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.request-permission,
.permission-denied {
  flex: 1;
  padding: 20px 0;
  font-size: 1.2rem;
  gap: 20px;
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
