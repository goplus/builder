<template>
  <div class="container">
    <div class="head head-actions">
      <Transition name="slide-fade" mode="out-in" appear>
        <div v-if="contentReady" class="head-left">
          <!-- Maybe we could put actions of inner editors here? -->
        </div>
        <div v-else class="head-left">
          {{ $t({ zh: '正在进一步生成素材...', en: 'Further generating assets...' }) }}
        </div>
      </Transition>
      <div class="head-right">
        <UIButton
          size="large"
          class="insert-button"
          :disabled="!contentReady || addToProjectPending"
          @click="handleAddButton"
        >
          <span style="white-space: nowrap">
            {{
              addToProjectPending
                ? $t({ en: 'Pending...', zh: '正在添加...' })
                : $t({ en: 'Add to project', zh: '添加到项目' })
            }}
          </span>
        </UIButton>
        <UIButton size="large" :disabled="!contentReady" @click="handleToggleFav">
          <span style="white-space: nowrap">
            {{
              isFavorite
                ? $t({ en: 'Unfavorite', zh: '取消收藏' })
                : $t({ en: 'Favorite', zh: '收藏' })
            }}
          </span>
        </UIButton>
      </div>
    </div>
    <div class="content">
      <main>
        <Transition name="slide-fade" mode="out-in" appear>
          <template v-if="!contentReady">
            <div class="generating-info">
              <NSpin :size="64">
                <template #description>
                  <Transition name="slide-fade" mode="out-in" appear>
                    <span v-if="status === AIGCStatus.Waiting" class="generating-text">
                      {{ $t({ en: `Pending...`, zh: `排队中...` }) }}
                    </span>
                    <span v-else-if="status === AIGCStatus.Generating" class="generating-text">
                      {{ $t({ en: `Generating...`, zh: `生成中...` }) }}
                    </span>
                    <span
                      v-else-if="status === AIGCStatus.Finished && !contentReady"
                      class="generating-text"
                    >
                      {{ $t({ en: `Loading...`, zh: `加载中...` }) }}
                    </span>
                  </Transition>
                </template>
              </NSpin>
            </div>
          </template>
          <template v-else-if="status === AIGCStatus.Failed">
            <div class="failing-info">
              <NIcon color="var(--ui-color-danger-main, #ef4149)" :size="32">
                <CancelOutlined />
              </NIcon>
              <span v-if="status === AIGCStatus.Failed" class="failing-text">
                {{ $t({ en: `Generation failed`, zh: `生成失败` }) }}
              </span>
              <span v-else class="failing-text">
                {{ $t({ en: `Loading failed`, zh: `加载失败` }) }}
              </span>
            </div>
          </template>
          <template v-else>
            <AISpriteEditor
              v-if="asset.assetType === AssetType.Sprite"
              :asset="asset as TaggedAIAssetData<AssetType.Sprite>"
              class="asset-editor sprite-editor"
            />
            <AIBackdropEditor
              v-else-if="asset.assetType === AssetType.Backdrop"
              :asset="asset as TaggedAIAssetData<AssetType.Backdrop>"
              class="asset-editor backdrop-editor"
            />
            <AISoundEditor v-else-if="asset.assetType === AssetType.Sound" :asset="asset" />
          </template>
        </Transition>
      </main>
      <aside>
        <NScrollbar
          :content-style="{
            paddingRight: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }"
        >
          <div
            v-for="aiAsset in aiAssets"
            :key="aiAsset.id"
            class="ai-asset-wrapper"
            :class="{ selected: aiAsset.id === asset.id }"
          >
            <AIAssetItem
              :asset="aiAsset"
              :show-ai-asset-tip="false"
              @ready="aiAsset[isPreviewReady] = true"
              @click="aiAsset[isPreviewReady] && emit('selectAi', aiAsset)"
            />
          </div>
        </NScrollbar>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NIcon, NSpin } from 'naive-ui'
import { AssetType } from '@/apis/asset'
import UIButton from '@/components/ui/UIButton.vue'
import AIAssetItem from '../AIAssetItem.vue'
import { NScrollbar } from 'naive-ui'
import {
  AIGCStatus,
  generateAISprite,
  getAIGCStatus,
  type AIGCFiles,
  isContentReady,
  isPreviewReady,
  type TaggedAIAssetData
} from '@/apis/aigc'
import { debounce } from '@/utils/utils'
import { getFiles } from '@/models/common/cloud'
import { type File } from '@/models/common/file'
import { CancelOutlined } from '@vicons/material'
import AISpriteEditor from './AISpriteEditor.vue'
import AIBackdropEditor from './AIBackdropEditor.vue'
import AISoundEditor from './AISoundEditor.vue'
import { convertAIAssetToBackdrop } from '@/models/common/asset'
import { hashFileCollection } from '@/models/common/hash'
import { addAssetToFavorites, removeAssetFromFavorites } from '@/apis/user'

// Define component props
const props = defineProps<{
  asset: TaggedAIAssetData
  aiAssets: TaggedAIAssetData[]
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: TaggedAIAssetData]
  selectAi: [asset: TaggedAIAssetData]
}>()

const contentReady = ref(props.asset[isContentReady])
const contentJobId = ref<string | null>(null)
const status = ref<AIGCStatus>(AIGCStatus.Finished)

const generateContent = async () => {
  if (props.asset.assetType === AssetType.Sprite) {
    contentJobId.value = (await generateAISprite(props.asset.id)).spriteJobId
    pollStatus()
  } else if (props.asset.assetType === AssetType.Backdrop) {
    convertAIAssetToBackdrop(props.asset)
    contentReady.value = true
  } else if (props.asset.assetType === AssetType.Sound) {
    contentReady.value = true
  }
}

// avoid frequent requests when switching assets
const debouncedGenerateContent = debounce(generateContent, 2000)

watch(
  () => props.asset.id,
  () => {
    contentReady.value = props.asset[isContentReady]
    if (contentReady.value) {
      return
    }
    if (props.asset.assetType === AssetType.Sprite) {
      status.value = AIGCStatus.Waiting
      contentJobId.value = null
      debouncedGenerateContent()
    } else if (props.asset.assetType === AssetType.Backdrop) {
      generateContent()
    } else if (props.asset.assetType === AssetType.Sound) {
      contentReady.value = true
    }
  },
  { immediate: true }
)

const POLLING_INTERVAL = 500

const POLLING_MAX_COUNT = (10 * 60 * 1000) / POLLING_INTERVAL

let pollingCount = 0
type RequiredAIGCFiles = Required<AIGCFiles> & { [key: string]: string }
const pollStatus = async () => {
  if (!contentJobId.value) {
    return
  }
  if (status.value === AIGCStatus.Finished) {
    return
  }
  if (pollingCount >= POLLING_MAX_COUNT) {
    status.value = AIGCStatus.Failed
    return
  }

  pollingCount++

  const newStatus = await getAIGCStatus(contentJobId.value)
  status.value = newStatus.status

  if (newStatus.status === AIGCStatus.Finished) {
    const cloudFiles = newStatus.result?.files as RequiredAIGCFiles
    if (!cloudFiles) {
      status.value = AIGCStatus.Failed
      return
    }
    const files = (await getFiles(cloudFiles)) as {
      [key in keyof AIGCFiles]: File
    }

    if (!files) {
      status.value = AIGCStatus.Failed
      return
    }
    props.asset.files = cloudFiles
    props.asset.filesHash = await hashFileCollection(cloudFiles)
    props.asset.displayName = props.asset.displayName ?? props.asset.id
    props.asset[isContentReady] = true
    contentReady.value = true
    return
  }

  if (newStatus.status !== AIGCStatus.Failed) {
    setTimeout(pollStatus, POLLING_INTERVAL)
  }
}

const isFavorite = ref(false)

const handleAddButton = () => {
  emit('addToProject', props.asset)
}

const handleToggleFav = () => {
  isFavorite.value = !isFavorite.value
  if (isFavorite.value) {
    removeAssetFromFavorites(props.asset.id)
  } else {
    addAssetToFavorites(props.asset.id)
  }
}

const displayTime = computed(() => {
  return new Date(props.asset.cTime).toLocaleString()
})
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  padding-top: 0;
  border-bottom: 1px solid var(--ui-color-dividing-line-2, #cbd2d8);
}

.head-left {
  flex: 1;
}

.head-right {
  display: flex;
  gap: 10px;
}

.content {
  display: flex;
  height: 0;
  flex: 1;
  padding: 10px 0 10px 15px;
  padding-top: 0;
}

main {
  flex: 3;
  padding: 10px;
  border-right: 1px solid var(--ui-color-border, #cbd2d8);
  overflow: hidden;
}

aside {
  flex: 1;
  max-width: 250px;
  padding: 10px 0 10px 15px;
}

.ai-asset-wrapper {
  cursor: pointer;
  transition: border-color 0.3s;
  border-radius: calc(3px + var(--ui-border-radius-1));
  border: 3px solid transparent;
}

.ai-asset-wrapper.selected {
  border: 3px solid var(--ui-color-primary-main, #3f9ae5);
  border-radius: calc(3px + var(--ui-border-radius-1));
}

.generating-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.generating-text {
  display: inline-block;
  font-size: 1rem;
  color: var(--ui-color-turquoise-400, #3fcdd9);
}

.failing-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.failing-text {
  display: inline-block;
  font-size: 1rem;
  color: var(--ui-color-danger-main, #ef4149);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-from {
  transform: translateY(10px);
}

.slide-fade-leave-to {
  transform: translateY(-10px);
}
</style>
