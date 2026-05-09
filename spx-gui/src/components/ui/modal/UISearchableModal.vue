<!--
  Modal which is searchable (with search input in header)
-->

<template>
  <UIModal :radar="radar" :visible="visible" :auto-focus="false" mask-closable @update:visible="handleUpdateShow">
    <div class="flex flex-col">
      <div class="h-16 flex items-center py-4 px-6">
        <h4 class="flex-1 flex text-xl text-title">
          {{ title }}
        </h4>
        <slot name="input"></slot>
        <UIModalClose class="ml-2 -mr-1" @click="handleCloseButton" />
      </div>
      <UIDivider />
      <slot></slot>
    </div>
  </UIModal>
</template>
<script setup lang="ts">
import type { RadarNodeMeta } from '@/utils/radar'
import { UIDivider } from '@/components/ui'
import UIModal from './UIModal.vue'
import UIModalClose from './UIModalClose.vue'

defineProps<{
  title: string
  visible?: boolean
  radar?: RadarNodeMeta
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const handleUpdateShow = (visible: boolean) => {
  emit('update:visible', visible)
}

const handleCloseButton = () => {
  handleUpdateShow(false)
}
</script>
