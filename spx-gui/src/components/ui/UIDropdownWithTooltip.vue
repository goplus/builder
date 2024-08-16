<template>
  <UIDropdown
    trigger="click"
    :visible="dropdownVisible"
    @update:visible="handleDropdownVisibleChange"
  >
    <template #trigger>
      <div>
        <!--
            TODO:
            The empty `div` should be avoided. It is now required due to a warning: 
            `Runtime directive used on component with non-element root node. The directives will not function as intended.`
           -->
        <UITooltip :visible="tooltipVisible" @update:visible="handleTooltipVisibleChange">
          <template #trigger>
            <slot name="trigger"></slot>
          </template>
          <slot name="tooltip-content"></slot>
        </UITooltip>
      </div>
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
