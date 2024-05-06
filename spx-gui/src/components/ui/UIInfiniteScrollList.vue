<template>
  <div ref="listContainer" class="list-container">
    <UILoading v-if="isLoading" />
    <UIError v-else-if="loadError != null" :retry="fetch">
      {{ $t(loadError.userMessage) }}
    </UIError>
    <UIEmpty v-else-if="items.length === 0" />
    <ul v-else class="list" :style="{ gap: `${gap}px` }" @scroll="handleScroll">
      <slot></slot>
      <li v-if="isFetchingMore" class="fetch-more-container">
        <UILoading />
      </li>
      <li v-else-if="fetchMoreError != null" class="fetch-more-container">
        <UIError :retry="fetch">{{ $t(fetchMoreError.userMessage) }}</UIError>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { throttle } from 'lodash'
import { useContentSize } from '@/utils/dom'
import { UILoading, UIError, UIEmpty } from '@/components/ui'
import { useAction, type ActionException } from '@/utils/exception'
import type { ByPage, PaginationParams } from '@/apis/common'

const props = defineProps<{
  itemSize: { width: number; height: number }
  gap: number
  items: any[]
  listItems: (params?: PaginationParams) => Promise<ByPage<any>>
}>()

const emit = defineEmits<{
  'update:items': [any[]]
}>()

const listContainer = ref(null)
const { width: listContainerWidth, height: listContainerHeight } = useContentSize(listContainer)

// Calculate the number of rows and cols that can be displayed in the list container without overflowing.
const rows = computed(() =>
  Math.max(
    Math.floor(
      ((listContainerHeight.value ?? 0) + props.gap) / (props.itemSize.height + props.gap)
    ),
    3
  )
)
const cols = computed(() =>
  Math.floor(((listContainerWidth.value ?? 0) + props.gap) / (props.itemSize.width + props.gap))
)

const pageSize = computed(() => (rows.value + 2) * cols.value) // 2 more rows for scrolling
const pageIndex = ref(1)
const hasMore = ref(false)
const fetchAction = useAction(
  async () => {
    const page = await props.listItems({ pageSize: pageSize.value, pageIndex: pageIndex.value })
    hasMore.value = page.data.length === pageSize.value
    emit('update:items', [...props.items, ...page.data])
  },
  {
    en: 'Failed to list items',
    zh: '获取列表失败'
  }
)

const isLoading = ref(true)
const isFetchingMore = ref(false)
watchEffect(() => {
  if (pageIndex.value === 1) isLoading.value = fetchAction.isLoading.value
  else isFetchingMore.value = fetchAction.isLoading.value
})

const loadError = ref<ActionException | null>(null)
const fetchMoreError = ref<ActionException | null>(null)
const fetch = async () => {
  await fetchAction.fn().then(
    () => {
      if (pageIndex.value === 1) loadError.value = null
      else fetchMoreError.value = null
    },
    (e) => {
      if (pageIndex.value === 1) loadError.value = e
      else fetchMoreError.value = e
    }
  )
}

let stopWatchListContainerSize = watch(
  [listContainerWidth, listContainerHeight],
  async ([width, height]) => {
    if (width !== null && height !== null) {
      stopWatchListContainerSize()
      await fetch()
    }
  }
)

const fetchMore = async () => {
  if (!hasMore.value || isFetchingMore.value || fetchMoreError.value != null) return
  pageIndex.value++
  await fetch()
}

const handleScroll = throttle(async (event) => {
  const { scrollTop, clientHeight } = event.target
  const triggerFetchMoreHeight = (props.itemSize.height + props.gap) * (rows.value + 1) - props.gap
  if (scrollTop + clientHeight >= triggerFetchMoreHeight) {
    await fetchMore()
  }
}, 100)
</script>

<style lang="scss" scoped>
.list-container {
  flex: 1 1 0;
  display: flex;
}

.list {
  flex: 1 1 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
}

.fetch-more-container {
  width: 100%;
  min-height: 45px;
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
