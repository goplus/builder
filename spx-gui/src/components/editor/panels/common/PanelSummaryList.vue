<!-- Summary List for Sprite/Sound Panel -->

<template>
  <ul ref="listWrapper" class="panel-summary-list">
    <slot></slot>
    <PanelSummaryMore v-if="hasMore" />
  </ul>
</template>

<script lang="ts">
import { computed, type Ref, type WatchSource } from 'vue'
import { useContentSize } from '@/utils/dom'
import { size as itemSize } from './PanelSummaryItem.vue'

export function useSummaryList<T>(list: Ref<T[]>, listWrapperSource: WatchSource<HTMLElement | null>) {
  const size = useContentSize(listWrapperSource)
  return computed(() => {
    const maxVisibleItemNum = Math.floor((size.value?.height ?? 0) / itemSize.height)
    if (list.value.length <= maxVisibleItemNum) {
      return {
        list: list.value,
        hasMore: false
      }
    }
    return {
      list: list.value.slice(0, maxVisibleItemNum).slice(0, -1),
      hasMore: list.value.length > maxVisibleItemNum
    }
  })
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import PanelSummaryMore from './PanelSummaryMore.vue'

const listWrapper = ref<HTMLElement | null>(null)

defineProps<{
  hasMore: boolean
}>()

defineExpose({
  listWrapper
})
</script>

<style scoped lang="scss">
.panel-summary-list {
  padding: 12px;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
