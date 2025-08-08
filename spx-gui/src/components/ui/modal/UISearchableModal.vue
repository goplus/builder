<!--
  Modal which is searchable (with search input in header)
-->

<template>
  <UIModal :radar="radar" :visible="visible" :auto-focus="false" mask-closable @update:visible="handleUpdateShow">
    <div class="container">
      <div class="header">
        <h4 class="title">
          {{ title }}
        </h4>
        <slot name="input"></slot>
        <UIModalClose class="close" @click="handleCloseButton" />
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

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  padding: var(--ui-gap-middle) 24px;
  height: 64px;
}

.title {
  font-size: 16px;
  line-height: 26px;
  flex: 1;
  display: flex;
  color: var(--ui-color-title);
}

.close {
  margin-left: 8px;
  margin-right: -4px;
}
</style>
