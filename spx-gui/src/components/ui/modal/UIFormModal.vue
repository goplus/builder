<template>
  <UIModal :visible="visible" @update:visible="handleUpdateShow">
    <div class="container">
      <div class="header">
        <div :class="['title', { center: centerTitle }]">
          {{ title }}
        </div>
        <slot name="header-extra"></slot>
        <CloseBtn @click="handleCloseButton" />
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
import CloseBtn from './CloseBtn.vue'

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
  display: flex;
}

.center {
  text-align: center;
}

.divider {
  margin: 0;
}

.body {
  padding: 20px 24px;
}
</style>
