<script setup lang="ts">
import { UIIcon, type IconType } from '@/components/ui'

defineProps<{
  icon: IconType
}>()
</script>

<template>
  <button
    class="h-4.5 cursor-pointer flex items-center gap-1 rounded border-none bg-transparent p-0 text-xs text-text hover:text-grey-700"
  >
    <UIIcon :type="icon" />
    <slot></slot>
  </button>
</template>
