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
import { computed, ref, type Component, shallowRef, markRaw, watch } from 'vue'
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
const imageShareComponent = shallowRef<Component | null>(null)

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

async function initializePoster(): Promise<void> {
  if (posterURL.value) {
    return
  }

  if (isGeneratingPoster.value) {
    return new Promise<void>((resolve) => {
      const unwatch = watch(isGeneratingPoster, (generating) => {
        if (!generating) {
          unwatch()
          resolve()
        }
      })
    })
  }

  isGeneratingPoster.value = true
  try {
    posterURL.value = await createPosterURL()
  } catch (error) {
    console.error('Failed to generate poster:', error)
    throw error
  } finally {
    isGeneratingPoster.value = false
  }
}

function handlePlatformChange(platform: PlatformConfig) {
  selectedPlatform.value = platform
  setupPlatformShareContent(platform)
}

async function setupPlatformShareContent(platform: PlatformConfig) {
  imageShareComponent.value = null
  urlShareComponent.value = null

  let shareURL = ''
  if (platform.shareType.supportURL && platform.shareFunction.shareURL) {
    shareURL = await initShareURL(platform.basicInfo.name, projectSharingLink.value)
    if (platform.addShareStateURL) {
      shareURL = platform.addShareStateURL(shareURL)
    }

    if (shareURL) {
      const shareComponent = await platform.shareFunction.shareURL(shareURL)
      if (shareComponent) {
        urlShareComponent.value = markRaw(shareComponent)
      }
    }
    return
  }

  if (platform.shareType.supportImage && platform.shareFunction.shareImage) {
    try {
      // lazy load poster URL
      await initializePoster()

      if (!posterURL.value) {
        throw new Error('Failed to generate poster URL')
      }

      const shareResult = platform.shareFunction.shareImage(posterURL.value)

      // if shareResult is from an async function, await it
      if (shareResult instanceof Promise) {
        const comp = await shareResult
        imageShareComponent.value = comp ? markRaw(comp) : null
      } else {
        imageShareComponent.value = shareResult ? markRaw(shareResult) : null
      }
    } catch (error) {
      console.error('Failed to setup platform share content:', error)
      imageShareComponent.value = null
    }
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
