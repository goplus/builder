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
        <component :is="guideComponent" v-if="guideComponent" />
        <component :is="urlShareComponent" v-else-if="urlShareComponent" />
        <div v-else-if="isGeneratingPoster || isGeneratingQR" class="loading-container">
          <div class="loading-icon">⏳</div>
          <span class="loading-text">{{
            isGeneratingPoster
              ? $t({ en: 'Generating poster...', zh: '正在生成海报...' })
              : $t({ en: 'Preparing guide...', zh: '正在准备引导...' })
          }}</span>
        </div>
      </div>
    </div>
    <div v-else class="qrcode">
      <component :is="urlShareComponent" v-if="urlShareComponent" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { getProjectShareRoute } from '@/router'
import { computed, ref, type Component, shallowRef, markRaw, onMounted, watch, nextTick } from 'vue'
import { type PlatformConfig, initShareURL } from './platform-share'
import type { ProjectData } from '@/apis/project'
import PlatformSelector from './PlatformSelector.vue'
import Poster from './ProjectPoster.vue'
import { untilNotNull } from '@/utils/utils'

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
const guideComponent = shallowRef<Component | null>(null)

const projectSharingLink = computed(() => {
  return `${location.origin}${getProjectShareRoute(props.projectData.owner, props.projectData.name)}`
})

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(projectSharingLink.value),
  { en: 'Failed to copy link to clipboard', zh: '分享链接复制到剪贴板失败' },
  { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
)

// Create poster and return cloud URL
async function createPosterURL(): Promise<string> {
  const posterComp = await untilNotNull(posterCompRef)
  return await posterComp.createPoster()
}

// 缓存海报URL，避免每次切换平台都重新生成
const posterURL = ref<string | null>(null)
const isGeneratingPoster = ref(false)
const isGeneratingQR = ref(false)

// 初始化时生成海报URL
async function initializePoster() {
  if (posterURL.value || isGeneratingPoster.value) {
    return // 已经生成过或正在生成中
  }
  isGeneratingPoster.value = true
  posterURL.value = await createPosterURL()
  isGeneratingPoster.value = false
}

function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  // Reset components before regeneration
  guideComponent.value = null
  urlShareComponent.value = null
  void handleGenerateShareContent()
}

// 生成分享内容（对齐截图分享逻辑：优先图片引导，其次URL）
async function generateShareContent(platform: PlatformConfig): Promise<void> {
  // Prefer image flow when supported
  if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    try {
      if (!posterURL.value) {
        await initializePoster()
      }
      if (!posterURL.value) {
        throw new Error('Failed to generate poster URL')
      }
      const shareResult = platform.shareFunction.shareImage(posterURL.value)
      if (shareResult instanceof Promise) {
        const comp = await shareResult
        guideComponent.value = comp ? markRaw(comp) : null
      } else {
        guideComponent.value = shareResult ? markRaw(shareResult) : null
      }
      return
    } catch (error) {
      console.error('Failed to generate poster URL:', error)
      guideComponent.value = null
    }
  }

  // Fallback to URL flow
  if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    try {
      let shareURL = await initShareURL(platform.basicInfo.name, projectSharingLink.value)
      if (platform.addShareStateURL) {
        shareURL = platform.addShareStateURL(shareURL)
      }

      if (shareURL) {
        const shareComponent = await platform.shareFunction.shareURL(shareURL)
        if (shareComponent) {
          urlShareComponent.value = markRaw(shareComponent)
        }
      } 
    }catch (error) {
        console.error('Failed to generate URL share component:', error)
        urlShareComponent.value = null
      }
    }
}

// 包装带消息的生成器
const generateShareContentWithMessage = useMessageHandle(
  async (): Promise<void> => {
    if (!selectedPlatform.value) return
    await generateShareContent(selectedPlatform.value)
  },
  {
    en: 'Failed to generate share content',
    zh: '生成分享内容失败'
  }
)

// 处理加载状态的外层函数
async function handleGenerateShareContent(): Promise<void> {
  if (!selectedPlatform.value) return
  isGeneratingQR.value = true
  try {
    await generateShareContentWithMessage.fn()
  } finally {
    isGeneratingQR.value = false
  }
}

// 组件挂载时初始化海报生成
onMounted(() => {
  initializePoster()
})

// 监听可见性以在打开时触发生成
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      guideComponent.value = null
      urlShareComponent.value = null
      initializePoster()
      nextTick(() => {
        void handleGenerateShareContent()
      })
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
