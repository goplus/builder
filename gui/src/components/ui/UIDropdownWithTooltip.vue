<template>
  <UIDropdown
    trigger="click"
    :disabled="disabled"
    :visible="dropdownVisible"
    @update:visible="handleDropdownVisibleChange"
  >
    <template #trigger>
      <UITooltip :disabled="disabled" :visible="tooltipVisible" @update:visible="handleTooltipVisibleChange">
        <template #trigger>
          <slot name="trigger" :dropdown-visible="dropdownVisible"></slot>
        </template>
        <slot name="tooltip-content"></slot>
      </UITooltip>
    </template>
    <slot name="dropdown-content"></slot>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UITooltip } from '@/components/ui'
import { ref, watch } from 'vue'

const props = defineProps<{ disabled?: boolean }>()

const dropdownVisible = ref(false)
const tooltipVisible = ref(false)

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      dropdownVisible.value = false
      tooltipVisible.value = false
    }
  }
)

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
