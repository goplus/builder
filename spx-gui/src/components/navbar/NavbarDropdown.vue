<template>
  <UIDropdown placement="bottom-start">
    <template #trigger>
      <div v-radar="triggerRadar" class="h-full cursor-pointer flex items-center px-5 hover:bg-primary-600">
        <slot name="trigger"></slot>
        <UIIcon type="arrowDown" />
      </div>
    </template>
    <slot></slot>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIDropdown, UIIcon } from '@/components/ui'
import type { RadarNodeMeta } from '@/utils/radar'

defineProps<{
  triggerRadar: RadarNodeMeta
}>()
</script>
