<template>
  <div :class="cn('overflow-hidden rounded-md bg-grey-100 shadow-md', props.class)">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { cn, type ClassValue } from './utils'

const props = defineProps<{
  class?: ClassValue
}>()
</script>
