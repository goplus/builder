<template>
  <n-menu :options="menuOptions" :value="selectedValue" @update:value="handleUpdateValue"/>
</template>

<script setup lang="ts">
import { NIcon, NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useI18n } from '@/utils/i18n'
import { ref, watch } from 'vue'
import { useSearchCtx, type GetListAssetType } from './SearchContextProvider.vue'
import type { Component } from 'vue'
import { h } from 'vue'
import { DownloadForOfflineOutlined, FavoriteBorderRound, HistoryRound } from '@vicons/material'
import { BulbOutlined } from '@vicons/antd'

const { t } = useI18n()

const emit = defineEmits(['update:value'])
const searchCtx = useSearchCtx()

const selectedValue = ref<string>('')

function handleUpdateValue(key: string) {
  if (selectedValue.value === key && key !== '') {
    selectedValue.value = ''
  }
  setTimeout(() => {
    selectedValue.value = key
    emit('update:value', selectedValue.value)
  }, 0)
}

const renderIcon = (icon: Component, color?: string) => {
  return () => h(NIcon, { color }, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: t({ en: 'Public', zh: '公共素材' }),
    key: '',
    icon: renderIcon(BulbOutlined),
  },
  {
    label: t({ en: 'My Favorites', zh: '我的收藏' }),
    key: 'liked',
    icon: renderIcon(FavoriteBorderRound),
  },
  {
    label: t({ en: 'History', zh: '历史记录' }),
    key: 'history',
    icon: renderIcon(HistoryRound),
  },
  {
    label: t({ en: 'Imported', zh: '已导入素材' }),
    key: 'imported',
    icon: renderIcon(DownloadForOfflineOutlined),
  }
]

// if category changes, reset tabCategory and selectedValue
watch(
  () => searchCtx.category,
  () => {
    searchCtx.tabCategory = 'public'
    selectedValue.value = ''
  }
)
</script>
