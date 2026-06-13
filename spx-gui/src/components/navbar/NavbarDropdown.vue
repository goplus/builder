<template>
  <UIDropdown placement="bottom-start" :trigger="trigger">
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
import type { TriggerType } from '@/components/ui/UIDropdown.vue'
import type { RadarNodeMeta } from '@/utils/radar'

withDefaults(
  defineProps<{
    triggerRadar: RadarNodeMeta
    trigger?: TriggerType
  }>(),
  {
    trigger: 'hover'
  }
)
</script>
