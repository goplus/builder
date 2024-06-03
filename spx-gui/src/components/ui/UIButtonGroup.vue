<template>
  <div class="ui-button-group-container">
    <div
      v-for="key in Object.keys(values)"
      :key="key"
      :class="['item', { active: key === value }]"
      @click="emit('update:value', key)"
    >
      <component :is="values[key]" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { type Component } from 'vue'

defineProps<{
  value?: string
  values: {
    [key: string]: Component
  }
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()
</script>

<style scoped lang="scss">
.ui-button-group-container {
  display: flex;
}

.item {
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-grey-300);
  cursor: pointer;

  &.active {
    color: var(--ui-color-primary-400);
    background: var(--ui-color-primary-200);
    cursor: default;
  }

  &:first-child {
    border-radius: 12px 0px 0px 12px;
  }

  &:last-child {
    border-radius: 0px 12px 12px 0px;
  }
}
</style>
