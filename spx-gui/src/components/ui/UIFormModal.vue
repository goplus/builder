<template>
  <UIModal :visible="visible" @update:visible="handleUpdateShow">
    <div class="container">
      <div class="header">
        <div :class="['title', { center: centerTitle }]">
          {{ title }}
        </div>
        <div class="close" @click="handleCloseButton">×</div>
        <!-- TODO: replace x with an icon -->
      </div>

      <NDivider class="divider" />

      <div class="body">
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>
<script setup lang="ts">
import { NDivider } from 'naive-ui'
import UIModal from './UIModal.vue'

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
  position: relative;
  height: 56px;
}

.title {
  font-size: 16px;
  line-height: 26px;
  flex: 1;
}

.center {
  text-align: center;
}

.close {
  cursor: pointer;
  font-size: 24px;
  font-weight: 100;
  position: absolute;
  right: 20px;
}

.divider {
  margin: 0;
}

.body {
  padding: 20px 24px;
}
</style>
