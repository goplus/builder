<template>
  <UIFormModal
    :radar="{ name: 'Project sharing link modal', desc: 'Modal for sharing project links' }"
    :title="$t({ en: 'Project sharing link', zh: '项目分享链接' })"
    :visible="props.visible"
    :auto-focus="false"
    @update:visible="emit('cancelled')"
  >
    <div class="desc">
      {{
        $t({
          en: 'A sharing link to the project has been created. Feel free to copy it below to share the project with others.',
          zh: '项目的分享链接已生成。请复制下方链接，与他人分享该项目。'
        })
      }}
    </div>
    <div class="link">
      <UITextInput
        v-radar="{ name: 'Sharing link input', desc: 'Input field showing the project sharing link' }"
        :value="projectSharingLink"
        :readonly="true"
        @focus="$event.target.select()"
      />
      <UIButton
        v-radar="{ name: 'Copy button', desc: 'Click to copy sharing link to clipboard' }"
        class="copy-button"
        :loading="handleCopy.isLoading.value"
        @click="handleCopy.fn"
      >
        {{ $t({ en: 'Copy', zh: '复制' }) }}
      </UIButton>
    </div>
    <PlatformSelector v-model="selectedPlatform" @update:model-value="handlePlatformChange" />
    <div v-if="!selectedPlatform?.shareType.supportURL" class="share-content-row">
      <Poster ref="posterCompRef" :project-data="props.projectData" />

      <div class="side-content">
        <div v-if="selectedPlatform?.basicInfo.name === 'xiaohongshu'" class="xiaohongshu-guide">
          <h3>📱 {{ $t({ en: 'How to share to Xiaohongshu?', zh: '如何分享到小红书？' }) }}</h3>

          <div class="guide-steps">
            <div class="step">
              <span class="step-number">1️⃣</span>
              <div class="step-content">
                <strong>{{ $t({ en: 'Download Poster', zh: '下载海报' }) }}</strong>
                <p>{{ $t({ en: 'Click the button below to save poster', zh: '点击下方按钮保存海报到设备' }) }}</p>
              </div>
            </div>

            <div class="step">
              <span class="step-number">2️⃣</span>
              <div class="step-content">
                <strong>{{ $t({ en: 'Open Xiaohongshu App', zh: '打开小红书APP' }) }}</strong>
                <p>{{ $t({ en: 'Tap "+" to create new post', zh: '点击"+"号发布新笔记' }) }}</p>
              </div>
            </div>

            <div class="step">
              <span class="step-number">3️⃣</span>
              <div class="step-content">
                <strong>{{ $t({ en: 'Upload & Share', zh: '上传分享' }) }}</strong>
                <p>{{ $t({ en: 'Select the downloaded poster to share', zh: '选择刚下载的海报进行分享' }) }}</p>
              </div>
            </div>
          </div>

          <div class="api-notice">
            <span class="notice-icon">💡</span>
            <p>
              {{
                $t({ en: 'Manual upload required due to API limitations', zh: '由于API限制，需要手动上传，感谢理解' })
              }}
            </p>
          </div>

          <button class="download-btn primary" :disabled="!posterCompRef" @click="handleDownloadPoster">
            {{ $t({ en: 'Download Poster', zh: '下载海报' }) }}
          </button>
        </div>

        <div v-else class="qrcode-section">
          <img v-if="qrCodeData" :src="qrCodeData" alt="QR Code" />
          <div v-else-if="selectedPlatform?.shareType.supportImage" class="loading-container">
            <div class="loading-icon">⏳</div>
            <span class="loading-text">{{ $t({ en: 'Generating QR code...', zh: '正在生成二维码...' }) }}</span>
          </div>
          <div v-else class="unsupported-container">
            <div class="unsupport-icon">❌</div>
            <span class="unsupported-text">{{ $t({ en: 'Unsupported', zh: '暂不支持' }) }}</span>
          </div>
          <button class="download-btn" @click="handleDownloadPoster">
            {{ $t({ en: 'Download Poster', zh: '下载海报' }) }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="qrcode">
      <img v-if="qrCodeData" :src="qrCodeData" alt="QR Code" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getProjectShareRoute } from '@/router'
import { computed, ref } from 'vue'
import type { PlatformConfig } from './platform-share'
import type { ProjectData } from '@/apis/project'
import PlatformSelector from './PlatformSelector.vue'
import Poster from './ProjectPoster.vue'
import QRCode from 'qrcode'

const props = defineProps<{
  projectData: ProjectData
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

// 组件引用
const selectedPlatform = ref<PlatformConfig | undefined>(undefined)
const posterCompRef = ref<InstanceType<typeof Poster>>()
const qrCodeData = ref<string | null>(null)

const projectSharingLink = computed(() => {
  return `${location.origin}${getProjectShareRoute(props.projectData.owner, props.projectData.name)}`
})

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectSharingLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
)

async function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform

  const shareURL = await getPlatformShareURL(platform)
  if (shareURL) {
    const qrData = await generateQRCodeDataUrl(shareURL, platform.basicInfo.color)
    qrCodeData.value = qrData
  } else {
    qrCodeData.value = null
  }
}

async function getPlatformShareURL(platform: PlatformConfig) {
  if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    return platform.shareFunction.shareURL(projectSharingLink.value)
  } else if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    if (posterCompRef.value == null) {
      throw new Error('Poster component not ready')
    }
    const posterFile = await posterCompRef.value.createPoster()
    return await platform.shareFunction.shareImage(posterFile)
  } else {
    return null
  }
}

function generateQRCodeDataUrl(url: string, color: string) {
  return QRCode.toDataURL(url, {
    color: {
      dark: color,
      light: '#FFFFFF'
    },
    width: 120,
    margin: 1
  })
}

const handleDownloadPoster = async () => {
  if (!posterCompRef.value) return

  try {
    const posterFile = await posterCompRef.value.createPoster()
    const url = URL.createObjectURL(posterFile)
    const link = document.createElement('a')
    link.href = url
    link.download = `${props.projectData.name}-poster.png`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download poster:', error)
  }
}
</script>

<style scoped lang="scss">
.desc {
  color: var(--ui-color-grey-900);
  margin-bottom: 8px;
}

.link {
  display: flex;
  margin-bottom: 16px;
}

.copy-button {
  margin-left: 12px;
  white-space: nowrap;
}

.qrcode {
  display: flex;
  justify-content: center;
  align-items: center;
}

.qrcode img {
  width: 100px;
  height: 100px;
}

.share-content-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 18px;
}

.qrcode.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.unsupported-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.unsupported-text {
  font-size: 12px;
  color: var(--ui-color-hint-2);
  text-align: center;
}

.unsupport-icon {
  font-size: 48px;
  opacity: 0.5;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.loading-text {
  font-size: 12px;
  color: var(--ui-color-hint-2);
  text-align: center;
}

.loading-icon {
  font-size: 48px;
  opacity: 0.7;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.side-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 300px;
}

.xiaohongshu-guide {
  width: 100%;
  max-width: 320px;
  padding: 10px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffeef0 100%);
  border-radius: 12px;
  border: 2px solid #ffb3ba;
  box-shadow: 0 4px 12px rgba(255, 0, 53, 0.1);

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #ff0035;
    text-align: center;
  }
}

.guide-steps {
  margin-bottom: 16px;

  .step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .step-number {
    font-size: 16px;
    margin-right: 10px;
    flex-shrink: 0;
    line-height: 1.2;
  }

  .step-content {
    flex: 1;

    strong {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 2px;
    }

    p {
      font-size: 12px;
      color: #666;
      margin: 0;
      line-height: 1.3;
    }
  }
}

.api-notice {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;

  .notice-icon {
    font-size: 14px;
    margin-right: 6px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #888;
    line-height: 1.4;
  }
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

.download-btn.primary {
  width: 100%;
  background: linear-gradient(135deg, #ff0035 0%, #ff4d6d 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #e6002f 0%, #ff3366 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 0, 53, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  img {
    width: 100px;
    height: 100px;
  }
}
</style>
