<template>
  <UIMenuItem @click="handleOpenProject">
    <template #icon><img :src="openSvg" /></template>
    {{ $t({ en: 'Open project...', zh: '打开项目...' }) }}
  </UIMenuItem>
</template>

<script setup lang="ts">
import { UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useOpenProject } from '@/components/project'
import openSvg from './icons/open.svg'

const openProject = useOpenProject()
const handleOpenProject = useMessageHandle(openProject, {
  en: 'Failed to open project',
  zh: '打开项目失败'
}).fn
</script>
