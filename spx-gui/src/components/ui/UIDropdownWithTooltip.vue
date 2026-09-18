<template>
  <UIDropdown
    trigger="click"
    :visible="dropdownVisible"
    :placement="props.placement"
    :offset="props.offset"
    @update:visible="handleDropdownVisibleChange"
  >
    <template #trigger>
      <UITooltip :visible="tooltipVisible" @update:visible="handleTooltipVisibleChange">
        <template #trigger>
          <slot name="trigger" :expanded="dropdownVisible"></slot>
        </template>
        <slot name="tooltip-content"></slot>
      </UITooltip>
    </template>
    <slot name="dropdown-content"></slot>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UITooltip } from '@/components/ui'
import type { Offset, Placement } from './UIDropdown.vue'
import { onScopeDispose, ref } from 'vue'
import { activateDropdown, deactivateDropdown } from './dropdownGroup'

const props = defineProps<{ placement?: Placement; offset?: Offset }>()

const dropdownVisible = ref(false)
const tooltipVisible = ref(false)

function closeDropdown() {
  dropdownVisible.value = false
  tooltipVisible.value = false
}

const handleDropdownVisibleChange = (v: boolean) => {
  if (v) {
    activateDropdown(closeDropdown)
  } else deactivateDropdown(closeDropdown)
  dropdownVisible.value = v
  if (v) {
    tooltipVisible.value = false
  }
}

const handleTooltipVisibleChange = (v: boolean) => {
  tooltipVisible.value = v && !dropdownVisible.value
}

onScopeDispose(() => {
  deactivateDropdown(closeDropdown)
})
</script>
