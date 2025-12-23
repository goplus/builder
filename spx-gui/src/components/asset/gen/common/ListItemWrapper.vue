<script lang="ts" setup>
import { UIBlockItem, UIIcon } from '@/components/ui'

defineEmits<{
  add: []
}>()
</script>

<template>
  <div class="list-item-wrapper">
    <header class="header">
      <slot name="title"></slot>
    </header>

    <div class="list">
      <slot></slot>
      <UIBlockItem class="add-item" @click="$emit('add')">
        <UIIcon class="icon" type="plus" />
      </UIBlockItem>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-item-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  font-size: 16px;
  color: var(--ui-color-grey-1000);
}

.list {
  display: flex;
  flex-direction: row;
  gap: 10px;
  overflow-x: auto;
}

.add-item {
  justify-content: center;
  color: var(--ui-color-primary-main);
  .icon {
    width: 24px;
    height: 24px;
  }
}
</style>
