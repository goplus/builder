<script setup lang="ts">
import { ref } from 'vue'
import { UIDropdown, UIIcon } from '@/components/ui'
import type { RadarNodeMeta } from '@/utils/radar'

const props = defineProps<{
  triggerRadar: RadarNodeMeta
}>()

const visible = ref(false)
</script>

<template>
  <UIDropdown v-model:visible="visible" trigger="click" placement="bottom-start">
    <template #trigger>
      <button
        v-radar="triggerRadar"
        type="button"
        class="h-full cursor-pointer flex items-center border-0 bg-transparent px-3 text-grey-1000 hover:bg-grey-400 focus-visible:outline-2 focus-visible:outline-primary-main"
        aria-haspopup="menu"
        :aria-expanded="visible"
        :aria-label="props.triggerRadar.name"
      >
        <slot name="trigger"></slot>
        <UIIcon type="arrowMini" class="w-2 ml-1" />
      </button>
    </template>
    <slot></slot>
  </UIDropdown>
</template>
