<template>
  <!-- TODO: show-feedback: false when no feedback content -->
  <NFormItem class="ui-form-item" :show-label="!!label" :label="label" :path="path">
    <div class="content">
      <slot></slot>
      <p v-if="!!slots.tip" class="tip"><slot name="tip"></slot></p>
    </div>
  </NFormItem>
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
.content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip {
  color: var(--ui-color-hint-1);
}
</style>
