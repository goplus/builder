<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import PlatformSelector from './PlatformSelector.vue'
import type { RecordingData } from '@/apis/recording'
import type { PlatformConfig } from './platform-share'
import { universalUrlToWebUrl } from '@/models/common/cloud'
import QRCode from 'qrcode'

const props = defineProps<{
  recording: Promise<RecordingData>
  video?: globalThis.File
  visible: boolean
}>()

type SharingResult =
  | {
      type: 'shared'
      platform: string
    }
  | {
      type: 'rerecord'
    }
const emit = defineEmits<{
  cancelled: []
  resolved: [result: SharingResult]
}>()

// 组件状态
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)

// 录制数据和视频源
const currentRecording = ref<RecordingData | null>(null)
const videoSrc = ref<string>('')

// 清理 object URLs
const createdObjectUrls = new Set<string>()

onUnmounted(() => {
  // 清理所有创建的 object URLs
  createdObjectUrls.forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  createdObjectUrls.clear()
})

// 录制页面URL
const recordPageUrl = computed(() => {
  return currentRecording.value ? `/record/${currentRecording.value.id}` : ''
})

// 加载录制数据
async function loadRecordingData() {
  if (currentRecording.value) return

  try {
    currentRecording.value = await props.recording
    await updateVideoSrc()
  } catch (error) {
    console.error('加载录制数据失败:', error)
  }
}

// 更新视频源地址 - 优先使用 props.video
async function updateVideoSrc() {
  if (props.video) {
    // 优先使用父组件传入的视频文件
    const url = URL.createObjectURL(props.video)
    createdObjectUrls.add(url)
    videoSrc.value = url
  } else if (currentRecording.value?.videoUrl) {
    // 其次使用录制数据中的视频URL，需要转换 kodo:// URL
    try {
      videoSrc.value = await universalUrlToWebUrl(currentRecording.value.videoUrl)
    } catch (error) {
      console.error('转换视频URL失败:', error)
      videoSrc.value = ''
    }
  } else {
    videoSrc.value = ''
  }
}

// 处理平台选择变化
function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  generateShareQRCode()
}

// 获取当前录制URL
function getCurrentRecordUrl() {
  return window.location.origin + recordPageUrl.value
}

// 生成分享二维码
async function generateShareQRCode() {
  if (!selectedPlatform.value) {
    return
  }

  // 确保录制数据已加载
  await loadRecordingData()

  if (!currentRecording.value) {
    return
  }

  try {
    isGeneratingQR.value = true

    // 根据平台类型生成跳转URL
    const platform = selectedPlatform.value
    const currentUrl = getCurrentRecordUrl()

    let shareUrl = ''

    // 检查平台支持的分享类型
    if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
      // 支持URL分享，直接分享录制页面链接
      shareUrl = await platform.shareFunction.shareURL(currentUrl)
    } else if (platform.shareType.supportVideo && platform.shareFunction.shareVideo && props.video) {
      // 支持视频分享，分享视频文件
      shareUrl = await platform.shareFunction.shareVideo(props.video)
    } else {
      // 默认使用录制页面URL
      shareUrl = currentUrl
    }

    jumpUrl.value = shareUrl
    // 使用 qrcode 库生成二维码
    try {
      const qrDataURL = await QRCode.toDataURL(shareUrl, {
        color: {
          dark: selectedPlatform.value?.basicInfo.color || '#000000',
          light: '#FFFFFF'
        },
        width: 120,
        margin: 1
      })
      qrCodeData.value = qrDataURL
    } catch (error) {
      console.error('生成二维码失败:', error)
      qrCodeData.value = ''
    }
  } catch (error) {
    console.error('生成分享二维码失败:', error)
  } finally {
    isGeneratingQR.value = false
  }
}

// 处理重新录制
async function handleReRecord(): Promise<void> {
  emit('resolved', { type: 'rerecord' })
}

// 处理一键下载视频
async function handleDownloadVideo(): Promise<void> {
  try {
    let videoFile: globalThis.File | null = null

    if (props.video) {
      videoFile = props.video
    } else if (currentRecording.value?.videoUrl) {
      try {
        const resp = await fetch(videoSrc.value)
        const blob = await resp.blob()
        videoFile = new globalThis.File([blob], `${currentRecording.value.id}.mp4`, { type: blob.type || 'video/mp4' })
      } catch {
        console.error('获取视频文件失败')
        return
      }
    }

    if (!videoFile) {
      console.error('没有可下载的视频文件')
      return
    }

    // 创建下载链接
    const url = URL.createObjectURL(videoFile)
    createdObjectUrls.add(url)

    // 创建临时下载链接并触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = videoFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('下载视频失败:', error)
  }
}

// 监听弹窗显示状态
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // 重置状态
      jumpUrl.value = ''
      qrCodeData.value = ''

      // 立即更新视频源（优先使用 props.video）
      updateVideoSrc()

      // 加载录制数据（用于分享参数）
      loadRecordingData()

      // 等待DOM更新后，如果有选择的平台则生成二维码
      nextTick(() => {
        if (selectedPlatform.value) {
          generateShareQRCode()
        }
      })
    }
  }
)

// 监听 video prop 变化
watch(
  () => props.video,
  () => {
    updateVideoSrc()
  }
)

// 处理视频加载开始
function handleVideoLoadStart(event: Event) {
  const video = event.target as HTMLVideoElement
  if (video.src.startsWith('blob:') && props.video) {
    // 如果是通过 createObjectURL 创建的 URL，添加到清理列表
    createdObjectUrls.add(video.src)
  }
}
</script>

<template>
  <div v-if="visible" class="project-recording-sharing">
    <div class="recording-sharing-content">
      <!-- 分享内容 -->
      <div class="share-content">
        <div class="share-title">
          {{ $t({ en: 'Your recording is amazing, share it with friends!', zh: '你的录制很棒，分享给好友吧!' }) }}
        </div>
        <div class="share-main">
          <div class="video-section">
            <div class="video-preview">
              <video v-if="videoSrc" :src="videoSrc" controls class="video-player" @loadstart="handleVideoLoadStart">
                您的浏览器不支持视频播放
              </video>
              <div v-else class="video-placeholder">
                <span>{{ $t({ en: 'No video available', zh: '暂无视频' }) }}</span>
              </div>
            </div>
            <div class="rerecord-section">
              <div class="rerecord-hint">
                {{ $t({ en: 'If you are not satisfied with the current recording:', zh: '如果对当前录屏不满意：' }) }}
              </div>
              <button class="rerecord-btn" @click="handleReRecord">
                {{ $t({ en: 'Re-record', zh: '重新录制' }) }}
              </button>
            </div>
          </div>
          <div class="qr-section">
            <div class="qr-section-inner">
              <div class="qr-content">
                <div class="qr-code">
                  <img
                    v-if="qrCodeData"
                    :src="qrCodeData"
                    :alt="$t({ en: 'Share QR Code', zh: '分享二维码' })"
                    class="qr-image"
                  />
                  <div v-else class="qr-placeholder">
                    <span v-if="isGeneratingQR">{{ $t({ en: 'Generating...', zh: '生成中...' }) }}</span>
                    <span v-else>{{
                      $t({ en: 'Select platform to generate QR code', zh: '选择平台生成二维码' })
                    }}</span>
                  </div>
                </div>
                <div class="qr-hint">
                  {{
                    $t({ en: 'Scan the code with the corresponding platform to share', zh: '用对应平台进行扫码分享' })
                  }}
                </div>
              </div>
              <div class="action-buttons">
                <button class="download-btn" :disabled="!videoSrc" @click="handleDownloadVideo">
                  {{ $t({ en: 'Download Video', zh: '下载视频' }) }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="platform-selector-container">
          <PlatformSelector @update:model-value="handlePlatformChange" />
        </div>
      </div>
      <div class="actions">
        <button class="cancel-btn" @click="$emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project-recording-sharing {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.recording-sharing-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
  min-width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
}

.share-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 20px 0;
}

.share-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-color-title);
  text-align: center;
  margin-bottom: 24px;
}

.share-main {
  height: 100%;
  display: flex;
  gap: 24px;
}

.video-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 16px;
}

.video-preview {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 16 / 9;
  border-radius: var(--ui-border-radius-1);
  overflow: hidden;
  background: var(--ui-color-grey-200);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  color: var(--ui-color-hint-2);
  padding: 40px;
}

.video-info {
  text-align: center;
  max-width: 400px;
}

.video-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-color-title);
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-description {
  font-size: 14px;
  color: var(--ui-color-hint-1);
  margin: 0 0 12px 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.video-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  color: var(--ui-color-hint-2);
}

.stat-item {
  display: flex;
  align-items: center;
}

.rerecord-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.rerecord-hint {
  font-size: 12px;
  color: var(--ui-color-hint-1);
  text-align: center;
}

.rerecord-btn {
  padding: 6px 16px;
  border: 1px solid var(--ui-color-primary-main);
  border-radius: 6px;
  background: var(--ui-color-primary-main);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: var(--ui-color-primary-shade);
    color: var(--ui-color-primary-main);
  }

  &:disabled {
    background: var(--ui-color-hint-2);
    border-color: var(--ui-color-hint-2);
    cursor: not-allowed;
  }
}

.platform-selector-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 0 20px;
}

.qr-section {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  min-width: 220px;
  min-height: 0;
  padding: 16px;
}

.qr-section-inner {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 0;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.qr-code {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ui-color-dividing-line-1);
  border-radius: 12px;
  background: white;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 12px;
  color: var(--ui-color-hint-2);
  padding: 20px;
}

.qr-hint {
  font-size: 12px;
  color: var(--ui-color-hint-2);
  line-height: 1.3;
  text-align: center;
  word-wrap: break-word;
  max-width: 100%;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
}

.download-btn {
  width: 100%;
  margin-top: 8px;
  border-radius: 6px;
  padding: 8px 16px;
  border: 1px solid var(--ui-color-primary-main);
  background: var(--ui-color-primary-main);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--ui-color-primary-shade);
    color: var(--ui-color-primary-main);
  }

  &:disabled {
    background: var(--ui-color-hint-2);
    border-color: var(--ui-color-hint-2);
    cursor: not-allowed;
  }
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  justify-content: center;
}

.cancel-btn {
  padding: 8px 16px;
  border: 1px solid var(--ui-color-red-main);
  border-radius: 6px;
  background: white;
  color: var(--ui-color-red-main);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;

  &:hover {
    background: var(--ui-color-red-tint);
    border-color: var(--ui-color-red-main);
  }
}
</style>
