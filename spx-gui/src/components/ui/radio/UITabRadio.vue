<template>
  <li class="ui-tab-radio" :class="{ active: isActive }" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { radioGroupValueKey, updateRadioValueKey } from './UITabRadioGroup.vue'

const props = defineProps<{
  value: string
}>()

const radioGroupValue = inject(radioGroupValueKey)
const updateRadioValue = inject(updateRadioValueKey)

const isActive = computed(() => radioGroupValue?.value === props.value)

const handleClick = () => {
  updateRadioValue?.(props.value)
}
</script>

<style scoped lang="scss">
.ui-tab-radio {
  display: flex;
  flex: 1 1 0;
  padding: 5px 8px;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  color: var(--ui-color-hint-1);
  transition: 0.2s; // TODO: animation for background slide?

  &.active {
    border-radius: 8px;
    color: var(--ui-color-title);
    background: var(--ui-color-grey-100);
    box-shadow:
      0px 6px 10px 0px rgba(14, 18, 27, 0.06),
      0px 2px 4px 0px rgba(14, 18, 27, 0.03);
  }
}
</style>
