<template>
  <div :class="cn('w-full flex flex-col', props.class)">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { cn, type ClassValue } from '../utils'

const props = defineProps<{
  class?: ClassValue
}>()
</script>
