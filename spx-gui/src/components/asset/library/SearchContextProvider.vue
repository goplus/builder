<template>
  <slot></slot>
</template>

<script lang="ts">
import { inject } from 'vue'
import { ActionException, useQuery } from '@/utils/exception'
import { categoryAll, type Category } from './category'
import type { ByPage } from '@/apis/common'

export type SearchCtx = {
  keyword: string
  category: Category
  page: number
}

export type SearchResultCtx = {
  isLoading: boolean
  assets: ByPage<AssetData> | null
  error: ActionException | null
  refetch: () => void
}

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
import { provide, type InjectionKey, reactive, watch, computed } from 'vue'
import { listAsset, AssetType, IsPublic, type AssetData } from '@/apis/asset'

const props = defineProps<{
  type: AssetType
}>()

const searchCtx = reactive<SearchCtx>({
  keyword: '',
  category: categoryAll,
  page: 0,
})

provide(searchCtxKey, searchCtx)

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}

const entityMessage = computed(() => entityMessages[props.type])

// "personal" is not actually a category. Define it as a category for convenience
const categoryPersonal = computed<Category>(() => ({
  value: 'personal',
  message: { en: `My ${entityMessage.value.en}s`, zh: `我的${entityMessage.value.zh}` }
}))

const {
  isLoading,
  data,
  error,
  refetch
} = useQuery(
  () => {
    const c = searchCtx.category.value
    const cPersonal = categoryPersonal.value.value
    return listAsset({
      pageSize: 500, // try to get all
      pageIndex: 1,
      assetType: props.type,
      keyword: searchCtx.keyword,
      category: c === categoryAll.value || c === cPersonal ? undefined : c,
      owner: c === cPersonal ? undefined : '*',
      isPublic: c === cPersonal ? undefined : IsPublic.public
    })
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  }
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