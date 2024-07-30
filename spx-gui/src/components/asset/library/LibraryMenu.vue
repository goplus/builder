<template>
  <n-menu :options="menuOptions" :value="selectedValue" @update:value="handleUpdateValue"/>
</template>

<script setup lang="ts">
import { useMessage,NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useI18n } from '@/utils/i18n'
import { ref } from 'vue'

const { t } = useI18n()

const emit = defineEmits(['update:value'])

const selectedValue = ref<string | null>(null)

function handleUpdateValue(key: string) {
  if (selectedValue.value === key) {
    selectedValue.value = null
    emit('update:value', '*')
  } else {
    selectedValue.value = key
    emit('update:value', selectedValue.value)
  }
  
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