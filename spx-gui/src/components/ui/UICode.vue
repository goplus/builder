<template>
  <code :class="rootClass">
    <slot></slot>
  </code>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { cn, type ClassValue } from './utils'

const props = defineProps<{
  class?: ClassValue
}>()

const rootClass = computed(() =>
  cn('rounded-[4px] bg-primary-200 px-1 py-[2px] font-code text-2xs text-primary-main', props.class ?? null)
)
</script>
