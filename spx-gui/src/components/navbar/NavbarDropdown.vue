<template>
  <UIDropdown placement="bottom-start">
    <template #trigger>
      <div v-radar="triggerRadar" class="h-full flex items-center px-3 hover:bg-grey-400">
        <slot name="trigger"></slot>
        <UIIcon type="arrowMini" class="w-2 ml-1" />
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
