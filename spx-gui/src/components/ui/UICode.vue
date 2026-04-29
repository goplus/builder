<template>
  <code :class="cn('rounded-sm bg-primary-200 px-1 py-0.5 font-code text-2xs text-primary-main', props.class)">
    <slot></slot>
  </code>
</template>

<script setup lang="ts">
import { cn, type ClassValue } from './utils'

const props = defineProps<{
  class?: ClassValue
}>()
</script>
