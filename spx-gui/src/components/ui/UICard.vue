<template>
  <div v-bind="rootAttrs" :class="rootClass">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cn, type ClassValue } from './utils'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const rootClass = computed(() =>
  cn('overflow-hidden rounded-lg bg-grey-100 shadow-diffusion', attrs.class as ClassValue | null)
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
