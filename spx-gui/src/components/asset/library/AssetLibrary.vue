<template>
  <div class="container">
    <div class="header">
      <h4 class="title">
        {{ $t({ en: 'Asset Library', zh: `素材库` }) }}
      </h4>
      <LibraryTab @update:value="handleChangeType" class="tab"/>
      <UITextInput
        v-model:value="searchInput"
        class="search-input"
        clearable
        :placeholder="$t({ en: 'Search', zh: '搜索' })"
        @keypress.enter="handleSearch"
      >
        <template #prefix><UIIcon class="search-icon" type="search" /></template>
      </UITextInput>
      <UIModalClose class="close" @click="handleCloseButton" />
    </div>
    <UIDivider />
    <section class="body">
      <main class="main">
        <div class="content">
          <LibrarySelect/>
          <UILoading v-if="searchResultCtx.isLoading" />
          <UIError v-else-if="searchResultCtx.error != null" :retry="searchResultCtx.refetch">
            {{ $t(searchResultCtx.error.userMessage) }}
          </UIError>
          <UIEmpty v-else-if="searchResultCtx.assets?.data.length === 0" size="large" />
          <ul v-else-if="searchResultCtx.assets != null && type === AssetType.Sound" class="asset-list">
            <SoundItem
              v-for="asset in searchResultCtx.assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
          <ul v-else-if="searchResultCtx.assets != null && type === AssetType.Sprite" class="asset-list">
            <SpriteItem
              v-for="asset in searchResultCtx.assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
          <ul v-else-if="searchResultCtx.assets != null && type === AssetType.Backdrop" class="asset-list">
            <BackdropItem
              v-for="asset in searchResultCtx.assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
        </div>
        <footer class="footer">
          <span v-show="selected.length > 0">
            {{
              $t({
                en: `${selected.length} ${entityMessage.en}${selected.length > 1 ? 's' : ''} selected`,
                zh: `已选中 ${selected.length} 个${entityMessage.zh}`
              })
            }}
          </span>
          <UIButton
            size="large"
            :disabled="selected.length === 0"
            :loading="handleConfirm.isLoading.value"
            @click="handleConfirm.fn"
          >
            {{ $t({ en: 'Confirm', zh: '确认' }) }}
          </UIButton>
        </footer>
      </main>
      <div class="sider">
        <LibraryMenu @update:value="handleSelectCategory"/>
        <UIDivider />
        <LibraryTree :type="type" @update="handleSelectCategory"/>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, shallowReactive, watch } from 'vue'
import {
  UITextInput,
  UIIcon,
  UITag,
  UILoading,
  UIEmpty,
  UIError,
  UIButton,
  UIModalClose,
  UIDivider
} from '@/components/ui'
import { AssetType, type AssetData } from '@/apis/asset'
import { debounce } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import { useSearchCtx, useSearchResultCtx } from './SearchContextProvider.vue'
import LibraryMenu from './LibraryMenu.vue'
import LibraryTree from './LibraryTree.vue'
import LibraryTab from './LibraryTab.vue'
import LibrarySelect from './LibrarySelect.vue'

const props = defineProps<{
  visible?: boolean
  project: Project
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  cancelled: []
  resolved: [AssetModel[]]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const handleCloseButton = () => {
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
const type = ref(searchCtx.type)//just for display

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

function handleSelectCategory(c: string|string[]) {
  searchCtx.category = c
}

function handleChangeType(t: AssetType) {
  searchCtx.type = t
}

const selected = shallowReactive<AssetData[]>([])

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

const handleConfirm = useMessageHandle(
  async () => {
    const action = {
      name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
    }
    const assetModels = await props.project.history.doAction(action, () =>
      Promise.all(selected.map(addAssetToProject))
    )
    emit('resolved', assetModels)
  },
  { en: 'Failed to add asset', zh: '素材添加失败' }
)

function isSelected(asset: AssetData) {
  return selected.some((a) => a.id === asset.id)
}

async function handleAssetClick(asset: AssetData) {
  const index = selected.findIndex((a) => a.id === asset.id)
  if (index < 0) selected.push(asset)
  else selected.splice(index, 1)
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
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
  }
  .tab{
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
  }

  .sider {
    flex: 0 0 196px;
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
  .content {
    height: 70vh;
    padding: 8px 0 0 24px; // no right padding to allow optional scrollbar
    overflow-y: auto;
    overflow-x: visible;
  }
  .select{
    margin-left: 50vw;
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
</style>