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
      <div class="poster-col">
        <Poster ref="posterCompRef" :project-data="props.projectData" />
      </div>
      <div class="qrcode side">
        <component :is="imageShareComponent" v-if="imageShareComponent" />
        <div v-else-if="selectedPlatform?.shareType.supportImage" class="loading-container">
          <div class="loading-icon">⏳</div>
          <span class="loading-text">{{ $t({ en: 'Preparing guide...', zh: '正在准备引导...' }) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="qrcode">
      <component :is="urlShareComponent" v-if="urlShareComponent" />
      <div v-else-if="selectedPlatform?.shareType.supportURL" class="loading-container">
        <div class="loading-icon">⏳</div>
        <span class="loading-text">{{ $t({ en: 'Preparing QR code...', zh: '正在准备二维码...' }) }}</span>
      </div>
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getProjectShareRoute } from '@/router'
import { computed, ref, type Component, shallowRef, markRaw } from 'vue'
import type { PlatformConfig } from './platform-share'
import type { ProjectData } from '@/apis/project'
import PlatformSelector from './PlatformSelector.vue'
import Poster from './ProjectPoster.vue'
import { DefaultException } from '@/utils/exception'

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
const urlShareComponent = shallowRef<Component | null>(null)
const imageShareComponent = shallowRef<Component | null>(null)

const projectSharingLink = computed(() => {
  return `${location.origin}${getProjectShareRoute(props.projectData.owner, props.projectData.name)}`
})

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectSharingLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
)

function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform

  setupPlatformShareContent(platform)
}

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

async function setupPlatformShareContent(platform: PlatformConfig) {
  imageShareComponent.value = null
  urlShareComponent.value = null

  if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    const shareComponent = await platform.shareFunction.shareURL(projectSharingLink.value)
    if (shareComponent) {
      urlShareComponent.value = markRaw(shareComponent)
    }
    return
  }

  if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    const posterFile = await createPosterFile()
    if (!posterFile) {
      throw new Error('Poster component not ready after wait')
    }
    const comp = platform.shareFunction.shareImage(posterFile)
    imageShareComponent.value = comp ? markRaw(comp) : comp
    return
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

.poster-col {
  flex: 0 0 auto;
  width: 300px; /* match poster width */
}

.qrcode.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 360px;
  width: 360px;
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
