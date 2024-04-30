<template>
  <UIModal :visible="visible" auto-focus mask-closable @update:visible="handleUpdateShow">
    <div class="container">
      <div class="header">
        <div :class="['title', { center: centerTitle }]">
          {{ title }}
        </div>
        <UIModalClose class="close" @click="handleCloseButton" />
      </div>

      <UIDivider />

      <div class="body">
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>
<script setup lang="ts">
import { UIDivider } from '@/components/ui'
import UIModal from './UIModal.vue'
import UIModalClose from './UIModalClose.vue'

defineProps<{
  title: string
  visible?: boolean
  centerTitle?: boolean
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
  padding: 8px 24px;
  height: 56px;
}

.title {
  font-size: 16px;
  line-height: 26px;
  flex: 1;
  color: var(--ui-color-title);
}

.center {
  text-align: center;
  padding-left: 24px; // take a offset of the same size with close btn, to make the title content correctly centered
}

.body {
  padding: 20px 24px;
}

.close {
  margin-right: -4px;
}
</style>
