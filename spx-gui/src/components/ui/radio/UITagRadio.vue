<template>
  <UIChip :type="isActive ? 'primary' : 'boring'" @click="handleClick">
    <slot></slot>
  </UIChip>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import UIChip from '../UIChip.vue'
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
