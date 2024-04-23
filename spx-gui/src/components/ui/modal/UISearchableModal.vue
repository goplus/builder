<!--
  Modal which is searchable (with search input in header)
-->

<template>
  <UIModal :visible="visible" @update:visible="handleUpdateShow">
    <div class="container">
      <div class="header">
        <h4 class="title">
          {{ title }}
        </h4>
        <slot name="input"></slot>
        <CloseBtn @click="handleCloseButton" />
      </div>
      <UIDivider />
      <slot></slot>
    </div>
  </UIModal>
</template>
<script setup lang="ts">
import { UIDivider } from '@/components/ui'
import UIModal from './UIModal.vue'
import CloseBtn from './CloseBtn.vue'

defineProps<{
  title: string
  visible?: boolean
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
}
</style>
