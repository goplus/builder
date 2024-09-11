<template>
  <n-tree
    v-model:checked-keys="checkedKeys"
    v-model:expanded-keys="expandedKeys"
    block-line
    :data="data"
    expand-on-click
    cascade
    checkable
    :animated="false"
  />
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import type { TreeOption } from 'naive-ui'
import { categories, type Category } from './category'
import { type LocaleMessage, useI18n } from '@/utils/i18n'
import { NIcon, NTree } from 'naive-ui'
import { AssetType } from '@/apis/asset'
import { useSearchCtx } from './SearchContextProvider.vue'
import { ArrowForwardIosRound } from '@vicons/material'

const props = defineProps<{
  type: AssetType
}>()
const checkedKeys = ref<string[]>([])
const searchCtx = useSearchCtx()

const expandedKeys = ref<string[]>([])

function createData(categories: Category[], t: (key: LocaleMessage) => string): TreeOption[] {
  return categories.map((category) => ({
    label: t(category.message),
    key: category.value,
    children: category.children ? createData(category.children, t) : undefined,
    suffix: category.children
      ? () => {
          return h(
            NIcon,
            {
              color: 'var(--text-color)',
              style: {
                paddingRight: '10px'
              }
            },
            {
              default: () =>
                h(ArrowForwardIosRound, {
                  style: {
                    transform: expandedKeys.value.includes(category.value)
                      ? 'rotate(-90deg)'
                      : 'rotate(90deg)',
                    transition: 'transform 0.3s'
                  }
                })
            }
          )
        }
      : undefined
  }))
}

const { t } = useI18n()
const data = computed<TreeOption[]>(() =>
  createData(categories.find((category) => category.type === props.type)?.children!, t)
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

<style scoped>
:deep(.n-tree-node-switcher) {
  display: none;
}
:deep(.n-tree-node) {
  padding: 4px 8px;
  margin: 0 4px;
}
</style>
