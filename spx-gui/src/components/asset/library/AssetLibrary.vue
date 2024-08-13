<template>
  <div class="container">
    <div class="header">
      <h4 v-if="!selectedAsset" class="title">
        {{ $t({ en: 'Asset Library', zh: `素材库` }) }}
        <!-- For debug -->
        <span style="margin-left: 0.5rem" @dblclick="searchCtx.type = (searchCtx.type + 1) % 3">
          {{ $t(entityMessages[searchCtx.type]) }}
        </span>
      </h4>
      <h4 v-else-if="isAiAsset in selectedAsset" class="title">
        <!-- {{ $t({ en: 'Preview: ', zh: `预览: ` }) }} -->
        <NIcon size="14" color="var(--text-color)">
          <BulbOutlined />
        </NIcon>
        <span class="ai-asset-tip">
          {{ $t({ en: `Created by AI`, zh: `AI 创作` }) }}
        </span>
      </h4>
      <h4 v-else class="title">
        {{ $t({ en: 'Preview: ', zh: `预览: ` }) }}
        {{ selectedAsset?.displayName }}
      </h4>
      <NAutoComplete
        v-if="!selectedAsset"
        v-model:value="searchInput"
        class="search-input"
        :options="suggestionsOptions"
      >
        <template #default="{ handleInput, handleBlur, handleFocus, value: slotValue }">
          <UITextInput
            :value="slotValue"
            clearable
            :placeholder="$t({ en: 'Search', zh: '搜索' })"
            @input="handleInput"
            @focus="handleFocus"
            @blur="handleBlur"
            @keypress.enter="handleSearch"
          >
            <template #prefix>
              <UIIcon class="search-icon" type="search" />
            </template>
          </UITextInput>
        </template>
      </NAutoComplete>
      <UIModalClose class="close" @click="handleCloseButton" />
    </div>
    <UIDivider v-if="!(selectedAsset && isAiAsset in selectedAsset)" />
    <section v-show="!selectedAsset" class="body">
      <main class="main">
        <div class="order-select">
          <LibrarySelect />
        </div>
        <div class="content">
          <AssetList
            :add-to-project-pending="handleAddToProject.isLoading.value"
            @add-to-project="handleAddToProject.fn"
            @select="selectedAsset = $event"
            @select-ai="handleSelectAiAsset"
          />
        </div>
      </main>
      <div class="sider">
        <LibraryMenu @update:value="handleUserSelectCategory" />
        <UIDivider />
        <LibraryTree
          :type="type"
          style="flex: 1 1 0%; overflow: auto; scrollbar-width: thin"
          @update="handleSelectCategory"
        />
      </div>
    </section>
    <Transition name="fade" mode="out-in" appear>
      <section v-if="selectedAsset && isAiAsset in selectedAsset" class="body">
        <AIPreviewModal
          :asset="selectedAsset"
          :ai-assets="currentAIAssetList"
          class="asset-page"
          :add-to-project-pending="handleAddToProject.isLoading.value"
          @add-to-project="handleAddToProject.fn"
          @select-ai="handleSelectAiAsset"
        />
      </section>
      <section v-else-if="selectedAsset" class="body">
        <DetailModal
          :asset="selectedAsset"
          class="asset-page"
          :add-to-project-pending="handleAddToProject.isLoading.value"
          @add-to-project="handleAddToProject.fn"
        />
      </section>
    </Transition>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { UITextInput, UIIcon, UIModalClose, UIDivider } from '@/components/ui'
import { AssetType, getAssetSearchSuggestion, type AssetData } from '@/apis/asset'
import { debounce, useAsyncComputed } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import { NAutoComplete, NIcon, NSpin } from 'naive-ui'
import { BulbOutlined } from '@vicons/antd'
import { useSearchCtx, useSearchResultCtx } from './SearchContextProvider.vue'
import AssetList from './AssetList.vue'
import { isAiAsset, type AssetOrAIAsset, type TaggedAIAssetData } from '@/apis/aigc'
import LibraryMenu from './LibraryMenu.vue'
import LibraryTree from './LibraryTree.vue'
import DetailModal from './details/DetailModal.vue'
import LibrarySelect from './LibrarySelect.vue'
import type { AIAssetData } from '@/apis/aigc'
import AIPreviewModal from './ai/AIPreviewModal.vue'
import { addAssetToHistory } from '@/apis/user'

const props = defineProps<{
  visible?: boolean
  project: Project
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  cancelled: []
  resolved: [AssetModel[]]
}>()

const selectedAsset = ref<AssetOrAIAsset | null>(null)
const currentAIAssetList = ref<TaggedAIAssetData[]>([])

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const handleCloseButton = () => {
  if (selectedAsset.value) {
    selectedAsset.value = null
    return
  }

  if (addedModels.length > 0) {
    emit('resolved', addedModels)
  } else {
    emit('cancelled')
  }
  handleUpdateShow(false)
}

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}

const searchInput = ref('')
const searchCtx = useSearchCtx()
const searchResultCtx = useSearchResultCtx()
const entityMessage = computed(() => entityMessages[searchCtx.type])
const type = ref(searchCtx.type) //just for display

const suggestions = useAsyncComputed(async () => {
  return (await getAssetSearchSuggestion(searchCtx.keyword)).suggestions
})
const suggestionsOptions = computed(() => suggestions.value?.map((s) => ({ label: s, value: s })) ?? [])

// do search (with a delay) when search-input changed
watch(
  searchInput,
  debounce(() => {
    searchCtx.keyword = searchInput.value
  }, 500)
)

function handleSearch() {
  searchCtx.keyword = searchInput.value
}

function handleSelectCategory(c: string[]) {
  searchCtx.category = c
}

function handleUserSelectCategory(c: string) {
  searchCtx.tabCategory = c as 'liked' | 'history' | 'imported' | 'public'
}

function handleSelectAiAsset(asset: TaggedAIAssetData, aiAssetList?: TaggedAIAssetData[]) {
  selectedAsset.value = asset
  if (aiAssetList) {
    currentAIAssetList.value = aiAssetList
  }
}

async function addAssetToProject(asset: AssetData) {
  switch (asset.assetType) {
    case AssetType.Sprite: {
      const sprite = await asset2Sprite(asset)
      props.project.addSprite(sprite)
      await sprite.autoFit()
      return sprite
    }
    case AssetType.Backdrop: {
      const backdrop = await asset2Backdrop(asset)
      props.project.stage.addBackdrop(backdrop)
      return backdrop
    }
    case AssetType.Sound: {
      const sound = await asset2Sound(asset)
      props.project.addSound(sound)
      return sound
    }
    default:
      throw new Error('unknow asset type')
  }
}

const addedModels: AssetModel[] = []

const handleAddToProject = useMessageHandle(
  async (asset: AssetData) => {
    const action = {
      name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
    }
    const [, assetModel] = await Promise.all([
      addAssetToHistory(asset.id),
      props.project.history.doAction(action, () => addAssetToProject(asset))
    ])
    addedModels.push(assetModel)
  },
  { en: 'Failed to add asset', zh: '素材添加失败' },
  { en: 'Asset added successfully', zh: '素材添加成功' }
)
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  & {
    display: flex;
    align-items: center;
    padding: var(--ui-gap-middle) 24px;
    height: 64px;
  }

  .title {
    font-size: 16px;
    line-height: 26px;
    flex: 1;
    display: flex;
    color: var(--ui-color-title);
    align-items: center;
    gap: 8px;
  }

  .tab {
    flex: 1;
  }

  .close {
    margin-left: 8px;
    margin-right: -4px;
  }

  .search-input {
    width: 320px;
  }

  .search-icon {
    color: var(--ui-color-grey-700);
  }
}

.body {
  & {
    display: flex;
    justify-content: stretch;
    overflow: auto;
    flex: 1;
  }

  .sider {
    flex: 0 0 20%;
    min-width: 196px;
    display: flex;
    flex-direction: column;
    padding: var(--ui-gap-middle);
    gap: 16px;
    background: var(--ui-color-grey-200);
  }

  .main {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
  }

  .title {
    padding: 20px 24px 0;
    color: var(--ui-color-grey-900);
  }

  .order-select {
    padding: 12px 24px 0 0;
    width: 15rem;
    margin-left: auto;
  }

  .content {
    height: 70vh;
    padding: 8px 0 0 24px; // no right padding to allow optional scrollbar
    overflow-y: auto;
    overflow-x: visible;
  }

  .asset-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .footer {
    bottom: 56px;
    right: 196px;
    padding: 20px 24px;
    position: fixed;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--ui-gap-middle);
  }
}

.asset-page {
  width: 100%;
}

.fade-enter-active {
  transition: all 0.25s ease;
}
.fade-leave-active {
  display: none;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>
