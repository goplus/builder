<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PlatformSelector from './PlatformSelector.vue'
import XiaohongshuShareGuide from './XiaohongshuShareGuide.vue'
import { type RecordingData } from '@/apis/recording'
import { type PlatformConfig } from './platform-share'
import { universalUrlToWebUrl } from '@/models/common/cloud'
import { useObjectUrlManager } from '@/utils/object-url'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import QRCode from 'qrcode'

const props = defineProps<{
  recording: Promise<RecordingData>
  video?: File
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

// Component state
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)

// Recording data and video source
const currentRecording = ref<RecordingData | null>(null)
const videoSrc = ref<string>('')

// Use object URL manager
const { createUrl } = useObjectUrlManager()

// Recording page URL
const recordingPageUrl = computed(() => {
  return currentRecording.value ? `/recording/${currentRecording.value.id}` : ''
})

// Load recording data
async function loadRecordingData() {
  if (currentRecording.value) return

  currentRecording.value = await props.recording
  await updateVideoSrc()
}

// Update video source URL - prioritize props.video
async function updateVideoSrc() {
  if (props.video) {
    // Prioritize video file passed from parent component
    const url = createUrl(props.video)
    videoSrc.value = url
  } else if (currentRecording.value?.videoUrl) {
    // Otherwise use video URL from recording data, convert kodo:// URL
    videoSrc.value = await universalUrlToWebUrl(currentRecording.value.videoUrl)
  } else {
    videoSrc.value = ''
  }
}

// Handle platform selection change
function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  // QR code generation is handled automatically by watch, no need to call manually
}

// Use useMessageHandle wrapped platform change handler
const handlePlatformChangeWithMessage = useMessageHandle(handlePlatformChange, {
  en: 'Platform selection failed',
  zh: '平台选择失败'
})

// Get current recording URL
function getCurrentRecordingUrl() {
  return window.location.origin + recordingPageUrl.value
}

// Generate sharing QR code
async function generateShareQRCode() {
  if (!selectedPlatform.value) {
    return
  }

  // Ensure recording data is loaded
  await loadRecordingData()

  if (!currentRecording.value) {
    return
  }

  isGeneratingQR.value = true

  try {
    // Generate jump URL based on platform type
    const platform = selectedPlatform.value
    const currentUrl = getCurrentRecordingUrl()

    let shareUrl = ''

    // Check platform supported sharing types
    if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
      // Support URL sharing, directly share recording page link
      shareUrl = await platform.shareFunction.shareURL(currentUrl)
    } else if (platform.shareType.supportVideo && platform.shareFunction.shareVideo && props.video) {
      // Support video sharing, share video file
      shareUrl = await platform.shareFunction.shareVideo(props.video)
    } else {
      // Default to use recording page URL
      shareUrl = currentUrl
    }

    jumpUrl.value = shareUrl

    // Use qrcode library to generate QR code
    const qrDataURL = await QRCode.toDataURL(shareUrl, {
      color: {
        dark: selectedPlatform.value?.basicInfo.color || '#000000',
        light: '#FFFFFF'
      },
      width: 120,
      margin: 1
    })
    qrCodeData.value = qrDataURL
  } finally {
    isGeneratingQR.value = false
  }
}

// Handle re-recording
async function handleReRecord(): Promise<void> {
  emit('resolved', { type: 'rerecord' })
}

// Handle one-click video download
async function handleDownloadVideo(): Promise<void> {
  let videoFile: globalThis.File | null = null

  if (props.video) {
    videoFile = props.video
  } else if (currentRecording.value?.videoUrl) {
    const resp = await fetch(videoSrc.value)
    const blob = await resp.blob()
    videoFile = new globalThis.File([blob], `${currentRecording.value.id}.mp4`, { type: blob.type || 'video/mp4' })
  }

  if (!videoFile) {
    throw new DefaultException({
      en: 'No video file available for download',
      zh: '没有可下载的视频文件'
    })
  }

  // Create download link
  const url = createUrl(videoFile)

  // Create temporary download link and trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = videoFile.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Use useMessageHandle wrapped download handler function
const handleDownloadClick = useMessageHandle(
  handleDownloadVideo,
  {
    en: 'Failed to download video',
    zh: '下载视频失败'
  },
  {
    en: 'Video downloaded successfully',
    zh: '视频下载成功'
  }
)

// Listen to modal visibility state
watch(
  () => props.visible,
  async (newVisible) => {
    if (newVisible) {
      // Reset state
      jumpUrl.value = ''
      qrCodeData.value = ''

      try {
        // Update video source immediately (prioritize props.video)
        await updateVideoSrc()

        // Load recording data (for sharing parameters)
        await loadRecordingData()
      } catch (error) {
        // These are initialization errors, log but don't throw to avoid affecting modal display
        console.error('Failed to initialize video data:', error)
      }
    }
  }
)

// Listen to platform selection changes, automatically generate QR code
watch(
  selectedPlatform,
  async (newPlatform) => {
    if (newPlatform != null && props.visible) {
      try {
        // Only generate QR code when modal is visible and platform is selected
        await generateShareQRCode()
      } catch (error) {
        // QR code generation failed, log error but don't affect other functions
        console.error('Failed to generate sharing QR code:', error)
        qrCodeData.value = ''
      }
    }
  },
  { immediate: true }
)

// Listen to video prop changes
watch(
  () => props.video,
  async () => {
    try {
      await updateVideoSrc()
    } catch (error) {
      // Video source update failed, log error but don't affect other functions
      console.error('Failed to update video source:', error)
      videoSrc.value = ''
    }
  }
)
</script>

<template>
  <div v-if="visible" class="project-recording-sharing">
    <div class="recording-sharing-content">
      <!-- Share content -->
      <div class="share-content">
        <div class="share-title">
          {{ $t({ en: 'Your recording is amazing, share it with friends!', zh: '你的录制很棒，分享给好友吧!' }) }}
        </div>
        <div class="share-main">
          <div class="video-section">
            <div class="video-preview">
              <video v-if="videoSrc" :src="videoSrc" controls class="video-player">您的浏览器不支持视频播放</video>
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
              <XiaohongshuShareGuide
                v-if="selectedPlatform?.basicInfo.name === 'xiaohongshu'"
                type="video"
                :is-loading="handleDownloadClick.isLoading.value"
                @download="handleDownloadClick.fn"
              />

              <div v-else class="qr-content">
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
                <div class="action-buttons">
                  <button
                    class="download-btn"
                    :disabled="!videoSrc || handleDownloadClick.isLoading.value"
                    @click="handleDownloadClick.fn"
                  >
                    {{
                      handleDownloadClick.isLoading.value
                        ? $t({ en: 'Downloading...', zh: '下载中...' })
                        : $t({ en: 'Download Video', zh: '下载视频' })
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="platform-selector-container">
          <PlatformSelector @update:model-value="handlePlatformChangeWithMessage.fn" />
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
  display: flex;
  align-items: stretch;
  gap: 24px;
  min-height: 330px;
}

.video-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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
