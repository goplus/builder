<template>
  <!-- TODO: show-feedback: false when no feedback content -->
  <NFormItem class="ui-form-item" :show-label="!!label" :label="label" :path="path">
    <slot></slot>
  </NFormItem>
  <p v-if="!!slots.tip" class="tip"><slot name="tip"></slot></p>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { NFormItem } from 'naive-ui'

defineProps<{
  label?: string
  path?: string
}>()

const slots = useSlots()
</script>

<style lang="scss" scoped>
.ui-form-item :deep(.n-form-item-feedback-wrapper) {
  line-height: 1.57143;
  &:empty {
    display: none;
  }
}

.tip {
  margin-top: 4px;
  color: var(--ui-color-hint-1);
}
</style>
