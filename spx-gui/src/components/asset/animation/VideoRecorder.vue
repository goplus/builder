<template>
  <div class="video-recorder">
    <Transition name="slide-fade" mode="out-in" appear>
      <NSpin v-if="generatingAnimation" size="large" class="recorder-content loading">
        <template #description>
          <span style="color: white">
            {{
              generatingAnimationMessage ||
              $t({
                en: 'Generating animation...',
                zh: '正在生成动画...'
              })
            }}
          </span>
        </template>
      </NSpin>
    </Transition>
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
          <UIButton size="large" :disabled="generatingAnimation" @click="generateAnimation">
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
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { UIButton } from '@/components/ui'
import { NIcon, NSpin, useMessage } from 'naive-ui'
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
import { AIAnimateTask, ExtractMotionTask } from '@/models/aigc'
import type { TaggedAIAssetData } from '@/apis/aigc'
import type { AssetType } from '@/apis/asset'
import type { UniversalUrl } from '@/apis/common'

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

const generatingAnimation = ref(false)
const generatingAnimationMessage = ref<string | null>(null)

const props = defineProps<{
  imageUrl: UniversalUrl
}>()

const emit = defineEmits<{
  resolve: [materialUrl: UniversalUrl]
}>()

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

const errorMessage = useMessage()

const requestExtractMotion = async () => {
  generatingAnimationMessage.value = t({
    en: 'Extracting motion from recorded video...',
    zh: '正在从录制的视频中提取动作...'
  })
  if (!recordedBlob) {
    generatingAnimation.value = false
    return Promise.reject(new Error('No recorded video'))
  }
  const file = fromBlob('recorded-video.webm', recordedBlob)
  const { fileCollection } = await saveFiles({ 'recorded-video.webm': file })
  const videoKodoUrl = fileCollection['recorded-video.webm']
  const videoWebUrl = await getWebUrl(videoKodoUrl)

  const extractMotionTask = new ExtractMotionTask({
    videoUrl: videoWebUrl,
    callbackUrl: ''
  })

  extractMotionTask.start()

  return new Promise<string>((resolve, reject) => {
    extractMotionTask.addEventListener('AIGCFailed', () => {
      generatingAnimation.value = false
      reject(new Error('Failed to extract motion'))
    })
    extractMotionTask.addEventListener('AIGCFinished', () => {
      const result = extractMotionTask.result?.resultUrl
      if (!result) {
        generatingAnimation.value = false
        reject(new Error('Failed to extract motion'))
      } else {
        resolve(result)
      }
    })
  })
}

const requestGenerateAnimation = async (motionUrl: string) => {
  generatingAnimationMessage.value = t({
    en: 'Generating animation...',
    zh: '正在生成动画...'
  })
  const animTask = new AIAnimateTask({
    motionUrl,
    imageUrl: await getWebUrl(props.imageUrl),
    callbackUrl: '',
    genAnimation: true
  })
  animTask.start()
  return new Promise<string>((resolve, reject) => {
    animTask.addEventListener('AIGCFailed', () => {
      generatingAnimation.value = false
      reject(new Error('Failed to generate animation'))
    })
    animTask.addEventListener('AIGCFinished', () => {
      const result = animTask.result
      if (!result) {
        generatingAnimation.value = false
        reject(new Error('Failed to generate animation'))
      } else {
        resolve(result.materialUrl)
      }
    })
  })
}

const generateAnimation = async () => {
  generatingAnimation.value = true

  try {
    const motionUrl = await requestExtractMotion()
    if (!motionUrl) {
      generatingAnimation.value = false
      return
    }
    const materialUrl = await requestGenerateAnimation(motionUrl)
    if (!materialUrl) {
      generatingAnimation.value = false
      return
    }

    emit('resolve', materialUrl)
  } catch (error: any) {
    errorMessage.error(
      t({
        en: `Failed to generate animation: ${error.message}`,
        zh: `生成动画失败：${error.message}`
      })
    )
    generatingAnimation.value = false
  }
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

.recorder-content.loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}
</style>
