<template>
  <div class="ui-radio-group-container">
    <button
      v-for="option in options"
      :key="option.value"
      :class="{ active: option.value === value }"
      @click="emit('update:value', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  value?: string
  options: {
    label: string
    value: string
  }[]
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()
</script>
<style lang="scss" scoped>
.ui-radio-group-container {
  display: flex;
  gap: 12px;
  button {
    border-radius: 12px;
    height: 40px;
    font-weight: 600;
    font-size: 14px;
    line-height: 22px;
    padding: 0 16px;

    &.active {
      border: 1px solid var(--ui-color-primary-500);
      color: var(--ui-color-primary-500);
    }

    border: 1px solid var(--ui-color-grey-600);
    color: var(--ui-color-grey-900);
    outline: none;
    background: var(--ui-color-grey-100);
    cursor: pointer;
  }
}
</style>
