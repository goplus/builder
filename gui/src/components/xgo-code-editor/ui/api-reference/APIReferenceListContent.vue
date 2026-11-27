<script lang="ts">
import type { LocaleMessage } from '@/utils/i18n'
import type { APIReferenceItem } from '.'

export type SubCategory = {
  id: string
  label: LocaleMessage
  items: APIReferenceItem[]
}

export type MainCategory = {
  id: string
  label: LocaleMessage
  icon: string
  subCategories: SubCategory[]
}

export type APIReferenceListData = {
  groups: MainCategory[]
  ungroupedItems: APIReferenceItem[]
}
</script>

<script setup lang="ts">
import { stringifyDefinitionId } from '../../definition-id'

defineProps<{
  data: APIReferenceListData
  /** Reduces the gap between items within a group. Currently enabled only for search results. */
  compact?: boolean
}>()

defineSlots<{
  default(props: { item: APIReferenceItem }): unknown
}>()
</script>

<template>
  <li v-for="group in data.groups" :key="group.id" :data-category-id="group.id">
    <section v-for="subCategory in group.subCategories" :key="subCategory.id">
      <h5 class="sticky top-0 z-10 bg-grey-100 py-2 text-xs text-hint-2">{{ $t(subCategory.label) }}</h5>
      <ul class="flex flex-col pb-4" :class="compact ? 'gap-1' : 'gap-md'">
        <template v-for="item in subCategory.items" :key="stringifyDefinitionId(item.definition)">
          <slot :item="item" />
        </template>
      </ul>
    </section>
  </li>
  <li v-if="data.ungroupedItems.length > 0">
    <section>
      <h5 class="sticky top-0 z-10 bg-grey-100 py-2 text-xs text-hint-2">
        {{ $t({ en: 'Uncategorized', zh: '未分类' }) }}
      </h5>
      <ul class="flex flex-col pb-4" :class="compact ? 'gap-1' : 'gap-md'">
        <template v-for="item in data.ungroupedItems" :key="stringifyDefinitionId(item.definition)">
          <slot :item="item" />
        </template>
      </ul>
    </section>
  </li>
</template>
