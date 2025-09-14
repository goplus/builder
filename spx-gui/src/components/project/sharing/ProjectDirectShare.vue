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
import { computed, ref, onUnmounted, onMounted, watch, nextTick } from 'vue'
import type { PlatformConfig } from './platform-share'
import type { ProjectData } from '@/apis/project'
import PlatformSelector from './PlatformSelector.vue'
import Poster from './ProjectPoster.vue'
import QRCode from 'qrcode'
import { DefaultException } from '@/utils/exception'
// import unsupport from '@/assets/unsupport.svg'

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
const posterFile = ref<File | null>(null)
const qrCodeData = ref<string | null>(null)
const isGeneratingQR = ref(false)

// 清理 object URLs
const createdObjectUrls = new Set<string>()

const projectSharingLink = computed(() => {
  return `${location.origin}${getProjectShareRoute(props.projectData.owner, props.projectData.name)}`
})

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectSharingLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
)

// Handle platform selection change
function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  handleGenerateShareQRCode.fn()
}

// Create poster file
async function createPosterFile(): Promise<File> {
  // 等待海报组件准备就绪
  if (!posterCompRef.value) {
    throw new DefaultException({
      en: 'Poster component not ready',
      zh: '海报组件未准备好'
    })
  }
  // 等待海报组件内部元素完全渲染
  await nextTick()

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
async function generateShareUrl(platform: PlatformConfig): Promise<string | null> {
  if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    return await platform.shareFunction.shareURL(projectSharingLink.value)
  } else if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    // 优先使用预加载的海报，如果没有则重新生成
    const currentPosterFile = posterFile.value || (await createPosterFile())
    return await platform.shareFunction.shareImage(currentPosterFile)
  } else {
    return null
  }
}

// Generate QR code data URL
async function generateQRCodeDataUrl(shareUrl: string | null, color: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(shareUrl || '', {
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
const handleGenerateShareQRCode = useMessageHandle(
  async (): Promise<void> => {
    if (!selectedPlatform.value) return

    isGeneratingQR.value = true
    try {
      const platform = selectedPlatform.value
      const shareUrl = await generateShareUrl(platform)
      qrCodeData.value = await generateQRCodeDataUrl(shareUrl, platform.basicInfo.color)
    } finally {
      isGeneratingQR.value = false
    }
  },
  {
    en: 'Failed to generate share QR code',
    zh: '生成分享二维码失败'
  }
)

const handleDownloadPoster = async () => {
  if (posterCompRef.value == null) return

  const posterFile = await posterCompRef.value.createPoster()
  const url = URL.createObjectURL(posterFile)
  createdObjectUrls.add(url)
  const link = document.createElement('a')
  link.href = url
  link.download = 'poster.png'
  link.click()
}
// 组件挂载时预加载海报
onMounted(async () => {
  try {
    posterFile.value = await createPosterFile()

    // 海报加载完成后，如果当前平台需要海报分享，重新生成二维码
    if (selectedPlatform.value?.shareType.supportImage && !selectedPlatform.value?.shareType.supportURL) {
      await handleGenerateShareQRCode.fn()
    }
  } catch (error) {
    console.warn('Failed to preload poster:', error)
  }
})

onUnmounted(() => {
  // 清理所有创建的 object URLs
  createdObjectUrls.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  createdObjectUrls.clear()
})

watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      qrCodeData.value = null
      nextTick(() => {
        if (selectedPlatform.value) {
          handleGenerateShareQRCode.fn()
        }
      })
    }
  }
)

// 监听海报文件变化，当海报加载完成时重新生成二维码
watch(
  () => posterFile.value,
  async (newPosterFile) => {
    if (
      newPosterFile &&
      selectedPlatform.value?.shareType.supportImage &&
      !selectedPlatform.value?.shareType.supportURL
    ) {
      await handleGenerateShareQRCode.fn()
    }
  }
)
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
</style>
