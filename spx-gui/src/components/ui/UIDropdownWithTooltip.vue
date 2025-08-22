<template>
  <UIDropdown trigger="click" :visible="dropdownVisible" @update:visible="handleDropdownVisibleChange">
    <template #trigger>
      <UITooltip :visible="tooltipVisible" @update:visible="handleTooltipVisibleChange">
        <template #trigger>
          <slot name="trigger"></slot>
        </template>
        <slot name="tooltip-content"></slot>
      </UITooltip>
    </template>
    <slot name="dropdown-content"></slot>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UITooltip } from '@/components/ui'
import { ref } from 'vue'

const dropdownVisible = ref(false)
const tooltipVisible = ref(false)

const handleDropdownVisibleChange = (v: boolean) => {
  dropdownVisible.value = v
  if (v) {
    tooltipVisible.value = false
  }
}

const handleTooltipVisibleChange = (v: boolean) => {
  tooltipVisible.value = v && !dropdownVisible.value
}
</script>
