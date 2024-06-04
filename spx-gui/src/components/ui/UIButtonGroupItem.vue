<template>
  <div :class="['ui-button-group-item', { active: isActive }]" @click="handleClick">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { type Ref, computed, inject } from 'vue'

const props = defineProps<{
  value: string
}>()

const selectedValue = inject('selectedValue') as Ref<string>
const updateValue = inject('updateValue') as (value: string) => void

const isActive = computed(() => selectedValue.value === props.value)

const handleClick = () => {
  if (!isActive.value) {
    updateValue(props.value)
  }
}
</script>

<style scoped lang="scss">
.ui-button-group-item {
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
