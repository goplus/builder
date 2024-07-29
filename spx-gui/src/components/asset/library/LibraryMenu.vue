<template>
  <n-menu :options="menuOptions" @update:value="handleUpdateValue" />
</template>

<script setup lang="ts">
import { useMessage,NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'

const message = useMessage()

function handleUpdateValue(key: string, item: MenuOption) {
        message.info(`[onUpdate:value]: ${JSON.stringify(key)}`)
        message.info(`[onUpdate:value]: ${JSON.stringify(item)}`)
}

const menuOptions: MenuOption[] = [
  {
    label: '我的收藏',
    key: 'my-favorites',
  },
  {
    label: '历史素材',
    key: 'history',
  },
  {
   label: '已导入素材',
    key: 'imported',
  },
]

</script>