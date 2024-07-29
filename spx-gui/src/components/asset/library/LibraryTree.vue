<template>
  <n-tree
    block-line
    :data="data"
    :default-expanded-keys="defaultExpandedKeys"
    expand-on-click
    checkable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TreeOption } from 'naive-ui'
import { categories, type Category } from './category'
import { type LocaleMessage, useI18n } from '@/utils/i18n'
import { NTree } from 'naive-ui'

function createData(categories: Category[], t: (key: LocaleMessage) => string): TreeOption[] {
  return categories.map(category => ({
    label: t(category.message),
    key: category.value,
    children: category.children ? createData(category.children, t) : undefined
  }))
}

const { t } = useI18n()
const data = ref<TreeOption[]>(createData(categories, t))
const defaultExpandedKeys = ref<string[]>(['roles', 'backgrounds', 'audio'])
</script>
