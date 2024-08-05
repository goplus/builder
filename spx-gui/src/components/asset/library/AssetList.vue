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
    :item-size="148"
    :key-field="'id'"
    :item-resizable="false"
    :ignore-item-resize="true"
    @scroll="handleScroll"
    @wheel="handleScroll"
  >
    <template #default="{ item }: { item: GroupedAssetItem }">
      <div v-if="item.type === 'asset-group'" class="asset-list-row">
        <template v-for="asset in item.assets" :key="asset.id">
          <AssetItem
            :asset="asset"
            :add-to-project-pending="props.addToProjectPending"
            @add-to-project="(asset) => emit('addToProject', asset)"
            @click="emit('select', asset)"
          />
        </template>
      </div>
      <div v-else-if="item.type === 'loading-more'" class="more-info loading-more">
        <NSpin />
        {{ $t({ en: 'Loading more assets...', zh: '正在加载更多素材...' }) }}
      </div>
      <div v-else-if="item.type === 'no-more'" size="small" class="more-info no-more">
        <img :src="emptyImg" alt="empty" />
        {{ $t({ en: 'No more assets', zh: '没有更多素材了' }) }}
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
import { type AssetData } from '@/apis/asset'
import type { ActionException } from '@/utils/exception'
import emptyImg from '@/components/ui/empty/empty.svg'
import errorImg from '@/components/ui/error/default-error.svg'
import AssetItem from './AssetItem.vue'

const props = defineProps<{
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: AssetData]
  select: [asset: AssetData]
}>()

const searchCtx = useSearchCtx()
const searchResultCtx = useSearchResultCtx()

const COLUMN_COUNT = 4
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
  if (searchCtx.page * searchCtx.pageSize >= (searchResultCtx.assets?.total ?? 0)) {
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

// Append search result to assetList
watch(
  () => searchResultCtx.assets,
  (result) => {
    assetList.value.push(...(result?.data ?? []))
    if (searchCtx.page === 1) {
      loadMore()
    }
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
  gap: 2.5%;
  flex-wrap: nowrap;
  align-items: center;
  margin: 10px 2.5%;
}

.asset-list-row:not(:last-child) {
  margin-bottom: 20px;
}

.more-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  padding-right: 40px;
  padding-top: 0;
  font-size: 18px;
  color: var(--ui-color-grey-600);
}

.more-info img {
  width: 36px;
  height: 36px;
}
</style>
