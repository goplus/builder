<template>
  <div class="ui-menu-item">
    <div v-if="hasSlotIcon" class="icon">
      <slot name="icon"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

const slots = useSlots()
const hasSlotIcon = !!slots['icon']
</script>

<style lang="scss" scoped>
$line-height: 24px; // TODO: ui var?

.ui-menu-item {
  padding: 8px 12px;
  line-height: $line-height;
  display: flex;
  gap: 6px;
  cursor: pointer;

  &:hover {
    // TODO: recheck color here
    background-color: var(--ui-color-grey-400);
  }
}

.icon {
  width: $line-height;
  height: $line-height;

  :deep(*) {
    width: 100%;
    height: 100%;
  }
}
</style>
