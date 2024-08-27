<template>
  <n-tree
    v-model:checked-keys="checkedKeys"
    block-line
    :data="data"
    expand-on-click
    cascade
    checkable
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TreeOption } from 'naive-ui'
import { categories, type Category } from './category'
import { type LocaleMessage, useI18n } from '@/utils/i18n'
import { NTree } from 'naive-ui'
import { AssetType } from '@/apis/asset'
import { useSearchCtx, useSearchResultCtx } from './SearchContextProvider.vue';

const props = defineProps<{
  type: AssetType
}>()
const checkedKeys = ref<string[]>([])
const searchCtx = useSearchCtx()
function createData(categories: Category[], t: (key: LocaleMessage) => string): TreeOption[] {
  return categories.map((category) => ({
    label: t(category.message),
    key: category.value,
    children: category.children ? createData(category.children, t) : undefined
  }))
}

const { t } = useI18n()
const data = ref<TreeOption[]>(
  createData(
    categories.find((category) => category.value === AssetType[props.type].toLowerCase())
      ?.children!,
    t
  )
)
watch(
  checkedKeys,
  (newValue) => {
    searchCtx.category = newValue
  },
  { immediate: true }
)

//todo: if tabCategory changes, reset category,keyword and selectedValue
</script>
