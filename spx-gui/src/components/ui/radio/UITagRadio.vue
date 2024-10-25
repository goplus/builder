<template>
  <UITag :type="isActive ? 'primary' : 'boring'" @click="handleClick">
    <slot></slot>
  </UITag>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import UITag from '../UITag.vue'
import { radioGroupValueKey, updateRadioValueKey } from './UITagRadioGroup.vue'

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
