<template>
  <UIDropdown placement="bottom-start">
    <template #trigger>
      <div v-radar="triggerRadar" class="flex h-full cursor-pointer items-center px-5">
        <slot name="trigger"></slot>
        <UIIcon style="width: 16px; height: 16px" type="arrowDown" />
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
