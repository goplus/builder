<template>
  <template v-if="groupedAssetItems.length === 0">
    <UILoading v-if="searchResultCtx.isLoading" />
    <UIError v-else-if="searchResultCtx.error != null" :retry="searchResultCtx.refetch">
      {{ $t(searchResultCtx.error.userMessage) }}
    </UIError>
    <UIEmpty v-else-if="searchResultCtx.assets?.data.length === 0" size="large" />
  </template>
  <NVirtualList
    v-else
    ref="virtualList"
    class="asset-list"
    :items="groupedAssetItems"
    :item-size="140"
    :key-field="'id'"
    :item-resizable="true"
    @scroll="handleScroll"
    @wheel="handleScroll"
  >
    <template #default="{ item }: { item: GroupedAssetItem }">
      <div v-if="item.type === 'asset-group'" class="asset-list-row">
        <template v-for="asset in item.assets" :key="asset.id">
          <SoundItem
            v-if="asset.assetType === AssetType.Sound"
            :asset="asset"
            :selected="isSelected(asset)"
            @click="handleAssetClick(asset)"
          />
          <SpriteItem
            v-else-if="asset.assetType === AssetType.Sprite"
            :asset="asset"
            :selected="isSelected(asset)"
            @click="handleAssetClick(asset)"
          />
          <BackdropItem
            v-else-if="asset.assetType === AssetType.Backdrop"
            :asset="asset"
            :selected="isSelected(asset)"
            @click="handleAssetClick(asset)"
          />
        </template>
      </div>
      <div v-else-if="item.type === 'loading-more'" class="more-info loading-more">
        <NSpin />
        {{ $t({ en: 'Loading more...', zh: '加载更多...' }) }}
      </div>
      <div v-else-if="item.type === 'no-more'" size="small" class="more-info no-more">
        <img :src="emptyImg" alt="empty" />
        {{ $t({ en: 'No more', zh: '没有更多了' }) }}
      </div>
      <div v-else-if="item.type === 'loading-more-error'" class="more-info loading-more-error">
        <img :src="errorImg" alt="error" />
        {{ $t(item.error.userMessage) }}
      </div>
    </template>
  </NVirtualList>
</template>

<script lang="ts" setup>
import { computed, ref, shallowReactive, watch } from 'vue'
import { useSearchCtx, useSearchResultCtx, type SearchCtx } from './SearchContextProvider.vue'
import { UILoading, UIEmpty, UIError } from '@/components/ui'
import { NVirtualList, NSpin } from 'naive-ui'
import { AssetType, type AssetData } from '@/apis/asset'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import type { ActionException } from '@/utils/exception'
import emptyImg from '@/components/ui/empty/empty.svg'
import errorImg from '@/components/ui/error/default-error.svg'

const emit = defineEmits<{
  'update:selected': [selected: AssetData[]]
}>()

const searchCtx = useSearchCtx()
const searchResultCtx = useSearchResultCtx()

const COLUMN_COUNT = 6
const assetList = ref<AssetData[]>([])

type GroupedAssetItem =
  | {
      id: string
      type: 'asset-group'
      assets: AssetData[]
    }
  | {
      id: string
      type: 'loading-more'
    }
  | {
      id: string
      type: 'no-more'
    }
  | {
      id: string
      type: 'loading-more-error'
      error: ActionException
    }

const groupedAssetItems = computed(() => {
  const list = assetList.value
  const result: GroupedAssetItem[] = []

  if (list.length === 0) {
    return result
  }

  // Group assets by COLUMN_COUNT
  for (let i = 0; i < list.length; i += COLUMN_COUNT) {
    const assets = list.slice(i, i + COLUMN_COUNT)
    result.push({
      id: assets.map((a) => a.id).join(','),
      type: 'asset-group',
      assets
    })
  }

  // Add loading info
  if (searchResultCtx.isLoading) {
    result.push({
      id: 'loading-more',
      type: 'loading-more'
    })
  } else if (assetList.value.length >= (searchResultCtx.assets?.total ?? 0)) {
    result.push({
      id: 'no-more',
      type: 'no-more'
    })
  } else if (searchResultCtx.error != null) {
    result.push({
      id: 'loading-more-error',
      type: 'loading-more-error',
      error: searchResultCtx.error
    })
  }

  return result
})

const loadMore = () => {
  if (assetList.value.length >= (searchResultCtx.assets?.total ?? 0)) {
    return
  }
  searchCtx.page++
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (target.scrollHeight - target.scrollTop === target.clientHeight) {
    loadMore()
  }
}

const selected = shallowReactive<AssetData[]>([])

function isSelected(asset: AssetData) {
  return selected.some((a) => a.id === asset.id)
}

async function handleAssetClick(asset: AssetData) {
  const index = selected.findIndex((a) => a.id === asset.id)
  if (index < 0) selected.push(asset)
  else selected.splice(index, 1)

  emit('update:selected', selected)
}

// Append search result to assetList
watch(
  () => searchResultCtx.assets,
  (result) => {
    assetList.value.push(...(result?.data ?? []))
  }
)

// Reset assetList and page when searchCtx changes (except page itself)
watch(
  () =>
    (Object.keys(searchCtx) as (keyof SearchCtx)[])
      .filter((k) => k !== 'page')
      .map((k) => searchCtx[k]),
  () => {
    assetList.value = []
    searchCtx.page = 1
  }
)
</script>

<style>
.asset-list .v-vl{
  width: 100%;
}
</style>

<style scoped>
.asset-list {
  width: 100%;
}

.asset-list-row {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
.asset-list-row:not(:last-child) {
  margin-bottom: 8px;
}

.more-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  padding-right: 40px;
  font-size: 14px;
  color: var(--ui-color-grey-600);
}

.more-info img {
  width: 18px;
  height: 18px;
}
</style>
