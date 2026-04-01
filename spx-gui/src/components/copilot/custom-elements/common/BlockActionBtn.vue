<script setup lang="ts">
import { UIIcon, type IconType } from '@/components/ui'

defineProps<{
  icon: IconType
}>()
</script>

<template>
  <button
    class="flex h-4.5 cursor-pointer items-center gap-1 rounded border-none bg-transparent p-0 text-12 text-text hover:text-grey-700"
  >
    <UIIcon :type="icon" />
    <slot></slot>
  </button>
</template>
