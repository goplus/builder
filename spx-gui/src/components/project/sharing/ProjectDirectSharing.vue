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
      <Poster
        ref="posterCompRef"
        :project-data="props.projectData"/>
      <div class="qrcode side">
        <img :src="qrcodeURL" alt="QR Code"/>
        <button
          class="download-btn"
          @click="handleDownloadPoster"
        >
          {{ $t({ en: 'Download Poster', zh: '下载海报' }) }}
        </button>
      </div>
    </div>
    <div v-else class="qrcode">
      <img :src="qrcodeURL" alt="QR Code"/>
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getProjectShareRoute } from '@/router'
import { computed, ref, onUnmounted } from 'vue'
import type { PlatformConfig } from './platformShare'
import type { ProjectData } from '@/apis/project'
import PlatformSelector from './platformSelector.vue'
import Poster from './poster.vue'
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
const posterCompRef = ref<InstanceType<typeof Poster>>()

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

const selectedPlatform = ref<PlatformConfig | undefined>(undefined)

const qrcodeURL = ref<string>('')

/**
 * 生成二维码的可复用方法
 * @param url 需要转换为二维码的URL
 * @param options 二维码生成选项
 * @returns Promise<string> 二维码的dataURL
 */
const generateQRCode = async (url: string, options?: {
  color?: {
    dark: string
    light: string
  }
  width?: number
  margin?: number
}): Promise<string> => {
  const defaultOptions = {
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 200,
    margin: 1
  }

  const qrOptions = { ...defaultOptions, ...options }

  return await QRCode.toDataURL(url, qrOptions)
}

const handlePlatformChange = async (platform: PlatformConfig) => {
  selectedPlatform.value = platform
  if(platform.shareType.supportURL) {
      // 生成带平台颜色的二维码
      const url = await generateQRCode(
          projectSharingLink.value, 
          {
          color: {
              dark: platform.basicInfo.color,
              light: '#FFFFFF'
          },
          width: 200,
          margin: 1
          }
      )
      qrcodeURL.value = url
  }
  else {
      // TODO: 如果平台不支持URL分享，可以考虑其他分享方式
      // qrcodeURL.value = platform.shareFunction.shareImage(projectSharingLink.value)
      // 生成带平台颜色的二维码
      const url = await generateQRCode(
          projectSharingLink.value, 
          {
          color: {
              dark: platform.basicInfo.color,
              light: '#FFFFFF'
          },
          width: 200,
          margin: 1
          }
      )
      qrcodeURL.value = url
  }
}

const handleDownloadPoster = async () => {
  const posterFile = await posterCompRef.value?.createPoster()
  const url = URL.createObjectURL(posterFile as Blob)
  createdObjectUrls.add(url)
  const link = document.createElement('a')
  link.href = url
  link.download = 'poster.png'
  link.click()
}

onUnmounted(() => {
  // 清理所有创建的 object URLs
  createdObjectUrls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
  createdObjectUrls.clear()
})


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
</style>
