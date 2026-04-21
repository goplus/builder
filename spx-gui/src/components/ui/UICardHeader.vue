<script setup lang="ts">
import { computed } from 'vue'

import { cn } from './utils'

const props = defineProps<{
  class?: string
}>()

const rootClass = computed(() =>
  cn('flex h-12 items-center px-3 text-xl border-b border-grey-400 text-title', props.class ?? null)
)
</script>

<template>
  <div :class="rootClass">
    <slot></slot>
  </div>
</template>
