<template>
  <n-menu :options="menuOptions" @update:value="handleUpdateValue" />
</template>

<script setup lang="ts">
import { useMessage,NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useI18n } from '@/utils/i18n'

const { t } = useI18n()

const emit = defineEmits(['update:value'])

function handleUpdateValue(key: string) {
      emit('update:value', key)
}

const menuOptions: MenuOption[] = [
  {
    label: t({ en: 'My Favorites', zh: '我的收藏' }),
    key: 'my-favorites',
  },
  {
    label: t({ en: 'History', zh: '历史记录' }),
    key: 'history',
  },
  {
   label: t({ en: 'Imported', zh: '已导入素材' }),
    key: 'imported',
  },
]

</script>