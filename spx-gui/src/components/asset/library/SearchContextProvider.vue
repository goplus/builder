<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { ActionException, useQuery } from '@/utils/exception'
import type { ByPage } from '@/apis/common'
import { listLikedAsset, listHistoryAsset } from '@/apis/user'

export type SearchCtx = {
  keyword: string
  category: string[]
  page: number
  pageSize: number
  type: AssetType
  tabCategory: GetListAssetType
  orderBy: ListAssetParamOrderBy
}

export type SearchResultCtx = {
  isLoading: boolean
  assets: ByPage<AssetData> | null
  error: ActionException | null
  refetch: () => void
}

export type GetListAssetType = 'liked' | 'history' | 'imported' | 'public'

const searchCtxKey: InjectionKey<SearchCtx> = Symbol('search-ctx')
const searchResultCtxKey: InjectionKey<SearchResultCtx> = Symbol('search-result-ctx')

export function useSearchCtx() {
  const ctx = inject(searchCtxKey)
  if (ctx == null) throw new Error('useSearchCtx should be called inside of SearchContextProvider')
  return ctx
}

export function useSearchResultCtx() {
  const ctx = inject(searchResultCtxKey)
  if (ctx == null) throw new Error('searchResultCtxKey should be called inside of SearchContextProvider')
  return ctx
}
</script>

<script setup lang="ts">
import { provide, type InjectionKey, reactive, watch } from 'vue'
import { listAsset, AssetType, IsPublic, type AssetData, ListAssetParamOrderBy } from '@/apis/asset'

const props = defineProps<{
  type: AssetType
  owner: string
}>()

const searchCtx = reactive<SearchCtx>({
  keyword: '',
  category: [''],
  type: props.type,
  page: 1,
  pageSize: 15,
  tabCategory: 'public',
  orderBy: ListAssetParamOrderBy.TimeAsc
})

provide(searchCtxKey, searchCtx)

const getListAsset = (type: GetListAssetType,category:string[]) => {
  switch (type) {
    case 'liked':
    return listLikedAsset({
        pageSize: searchCtx.pageSize,
        pageIndex: searchCtx.page,
        assetType: searchCtx.type,
        keyword: '',
        category: [''],
        isPublic: undefined,
        orderBy: searchCtx.orderBy
      })
    case 'history':
    return listHistoryAsset({
        pageSize: searchCtx.pageSize,
        pageIndex: searchCtx.page,
        assetType: searchCtx.type,
        keyword: undefined,
        category: undefined,
        isPublic: undefined,
        orderBy: searchCtx.orderBy
      })
    case 'imported'://when imported, the category,keyword is not needed
    return listAsset({
        pageSize: searchCtx.pageSize,
        pageIndex: searchCtx.page,
        assetType: searchCtx.type,
        keyword: undefined,
        category: undefined,
        owner: props.owner,//backend will automatically filter the owner
        isPublic: IsPublic.personal,
        orderBy: searchCtx.orderBy
      })
    default:
      return listAsset({
        pageSize: searchCtx.pageSize,
        pageIndex: searchCtx.page,
        assetType: searchCtx.type,
        keyword: searchCtx.keyword,
        category: category,
        owner: '*',
        isPublic: IsPublic.public,
        orderBy: searchCtx.orderBy
      })
  }
}

const {
  isLoading,
  data,
  error,
  refetch
} = useQuery(
  () => {
    return getListAsset(searchCtx.tabCategory,searchCtx.category)
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  },
  true
)



const searchResultCtx = reactive<SearchResultCtx>({
  isLoading: isLoading.value,
  assets: data.value,
  error: error.value,
  refetch: refetch
})

provide(searchResultCtxKey, searchResultCtx)

watch(
  [isLoading, data, error],
  () => {
    searchResultCtx.isLoading = isLoading.value
    searchResultCtx.assets = data.value
    searchResultCtx.error = error.value
  },
)
</script>