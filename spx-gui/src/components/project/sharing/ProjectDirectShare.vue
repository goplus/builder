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
      <div class="qrcode side">
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
    // 生成海报文件并传递给shareImage方法
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
    // 清理URL对象
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
  gap: 48px;
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
</style>
