<template>
  <UIModal :visible="visible" @update:visible="handleUpdateShow">
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
  padding-left: 24px;
}

.center {
  text-align: center;
}

.body {
  padding: 20px 24px;
}

.close {
  margin-right: -4px;
}
</style>
