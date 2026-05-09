<script setup lang="ts">
import { cn } from './utils'

const props = defineProps<{
  class?: string
}>()
</script>

<template>
  <div :class="cn('h-12 flex items-center px-3 text-xl border-b border-grey-400 text-title', props.class)">
    <slot></slot>
  </div>
</template>
