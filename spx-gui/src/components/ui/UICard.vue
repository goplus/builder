<template>
  <div :class="rootClass">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { cn, type ClassValue } from './utils'

const props = defineProps<{
  class?: ClassValue
}>()

const rootClass = computed(() => cn('overflow-hidden rounded-lg bg-grey-100 shadow-diffusion', props.class))
</script>
