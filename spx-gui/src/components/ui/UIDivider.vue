<template>
  <div role="separator" :class="rootClass" :aria-orientation="props.vertical ? 'vertical' : 'horizontal'"></div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { cn, type ClassValue } from './utils'

const props = withDefaults(
  defineProps<{
    vertical?: boolean
    class?: ClassValue
  }>(),
  {
    vertical: false,
    class: undefined
  }
)

const rootClass = computed(() =>
  cn('bg-dividing-line-2 shrink-0', props.vertical ? 'w-px' : 'h-px w-full', props.class)
)
</script>
