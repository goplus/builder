<template>
  <code v-bind="codeAttrs" :class="rootClass">
    <slot></slot>
  </code>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cn, type ClassValue } from './utils'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const rootClass = computed(() =>
  cn('rounded-[4px] bg-primary-200 px-1 py-[2px] font-code text-10/[1.6] text-primary-main', attrs.class as ClassValue)
)
const codeAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
