<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Poster from './ProjectPoster.vue'
import PlatformSelector from './PlatformSelector.vue'
import type { ProjectData } from '@/apis/project'
import type { PlatformConfig } from './platform-share'
import QRCode from 'qrcode'
import { useMessageHandle } from '@/utils/exception'
import { DefaultException } from '@/utils/exception'
import { useObjectUrlManager } from '@/utils/object-url'

const props = defineProps<{
  screenshot: File
  projectData: ProjectData
  visible: boolean
}>()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit = defineEmits<{
  cancelled: []
  resolved: [platform: string]
}>()

// Initialize object URL manager
const objectUrlManager = useObjectUrlManager()
// Component references
const posterCompRef = ref<InstanceType<typeof Poster>>()

// Platform related state
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)

// Handle platform selection change
function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  handleGenerateShareQRCode()
}

// Get current project URL
function getCurrentProjectUrl(): string {
  return window.location.origin + window.location.pathname
}

// Create poster file
async function createPosterFile(): Promise<File> {
  if (!posterCompRef.value) {
    throw new DefaultException({
      en: 'Poster component not ready',
      zh: '海报组件未准备好'
    })
  }

  const posterFile = await posterCompRef.value.createPoster()
  if (!posterFile) {
    throw new DefaultException({
      en: 'Failed to generate poster',
      zh: '生成海报失败'
    })
  }

  return posterFile
}

// Generate share URL for platform
async function generateShareUrl(platform: PlatformConfig): Promise<string> {
  const currentUrl = getCurrentProjectUrl()

  if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    const posterFile = await createPosterFile()
    return await platform.shareFunction.shareImage(posterFile)
  } else if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    return await platform.shareFunction.shareURL(currentUrl)
  } else {
    return currentUrl
  }
}

// Generate QR code data URL
async function generateQRCodeDataUrl(shareUrl: string, color: string): Promise<string> {
  try {
    return await QRCode.toDataURL(shareUrl, {
      color: {
        dark: color || '#000000',
        light: '#FFFFFF'
      },
      width: 120,
      margin: 1
    })
  } catch (error) {
    throw new DefaultException({
      en: 'Failed to generate QR code',
      zh: '生成二维码失败'
    })
  }
}

// Generate share QR code with error handling
const generateShareQRCode = useMessageHandle(
  async (): Promise<void> => {
    if (!selectedPlatform.value) return

    const platform = selectedPlatform.value
    const shareUrl = await generateShareUrl(platform)
    const qrDataURL = await generateQRCodeDataUrl(shareUrl, platform.basicInfo.color)

    jumpUrl.value = shareUrl
    qrCodeData.value = qrDataURL
  },
  {
    en: 'Failed to generate share QR code',
    zh: '生成分享二维码失败'
  }
)

// Wrapper function for internal use that handles loading state
async function handleGenerateShareQRCode(): Promise<void> {
  if (!selectedPlatform.value) return

  isGeneratingQR.value = true
  try {
    await generateShareQRCode.fn()
  } catch (error) {
    // Reset QR code data on error
    qrCodeData.value = ''
    throw error
  } finally {
    isGeneratingQR.value = false
  }
}

// Handle poster download with proper error handling
const handleDownloadPoster = useMessageHandle(
  async (): Promise<void> => {
    const posterFile = await createPosterFile()

    // Create download link using object URL manager
    const url = objectUrlManager.createUrl(posterFile)

    // Create temporary download link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = posterFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
  {
    en: 'Failed to download poster',
    zh: '下载海报失败'
  },
  {
    en: 'Poster downloaded successfully',
    zh: '海报下载成功'
  }
)

// Watch modal visibility state
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // Reset state
      jumpUrl.value = ''
      qrCodeData.value = ''

      // Wait for DOM update then generate QR code
      nextTick(() => {
        if (selectedPlatform.value) {
          handleGenerateShareQRCode()
        }
      })
    }
  }
)
</script>

<template>
  <div v-if="visible" class="project-screenshot-sharing">
    <div class="screenshot-sharing-content">
      <!-- 分享内容 -->
      <div class="share-content">
        <div class="share-title">
          {{ $t({ en: 'This screenshot is great, share it with friends!', zh: '截图这么棒，分享给好友吧!' }) }}
        </div>
        <div class="share-main">
          <div class="poster-section">
            <Poster ref="posterCompRef" :img="screenshot" :project-data="projectData" />
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
                    <span>{{
                      isGeneratingQR
                        ? $t({ en: 'Generating...', zh: '生成中...' })
                        : $t({ en: 'Select platform to generate QR code', zh: '选择平台生成二维码' })
                    }}</span>
                  </div>
                </div>
                <div class="qr-hint">
                  {{
                    $t({ en: 'Scan the code with the corresponding platform to share', zh: '用对应平台进行扫码分享' })
                  }}
                </div>
              </div>
              <button
                class="download-btn"
                :disabled="handleDownloadPoster.isLoading.value"
                @click="handleDownloadPoster.fn"
              >
                {{
                  handleDownloadPoster.isLoading.value
                    ? $t({ en: 'Downloading...', zh: '下载中...' })
                    : $t({ en: 'Download Poster', zh: '下载海报' })
                }}
              </button>
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
.project-screenshot-sharing {
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

.screenshot-sharing-content {
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

.poster-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 16px;
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
    color: var(--ui-color-primary-main); // hover时文字显示为主题色
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

/*
.actions button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f0f0f0;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #e0e0e0;
    }
}
*/

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
