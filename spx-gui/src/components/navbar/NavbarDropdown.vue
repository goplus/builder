<script setup lang="ts">
import type { RadarNodeMeta } from '@/utils/radar'
import { UIDropdown, UIIcon } from '@/components/ui'
import { cn, type ClassValue } from '@/components/ui/utils'

const props = defineProps<{
  triggerRadar: RadarNodeMeta
  triggerClass?: ClassValue
}>()
</script>

<template>
  <UIDropdown placement="bottom-start">
    <template #trigger>
      <div
        v-radar="triggerRadar"
        :class="cn('h-full cursor-pointer flex items-center px-3 hover:bg-grey-400', props.triggerClass)"
      >
        <slot name="trigger"></slot>
        <UIIcon type="arrowMini" class="w-2 ml-1" />
      </div>
    </template>
    <slot></slot>
  </UIDropdown>
</template>
