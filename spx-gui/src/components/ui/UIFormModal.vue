<template>
  <UIModal :show="show" @update-show="handleUpdateShow">
    <div class="container">
      <div class="header">
        <div class="title">
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
  show?: boolean
}>()

const emit = defineEmits<{
  'update:show': [show: boolean]
}>()

const handleUpdateShow = (show: boolean) => {
  emit('update:show', show)
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
  justify-content: space-between;
  align-items: center;
  padding: 8px 24px;
}

.title {
  font-size: 16px;
  line-height: 26px;
}

.close {
  cursor: pointer;
  font-size: 24px;
}

.divider {
  margin: 0;
}

.body {
  padding: 20px 24px;
}
</style>
