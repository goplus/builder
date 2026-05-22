<script setup lang="ts">
import { computed } from 'vue'

import { useUITabsCtx } from './UITabs.vue'
import { cn, type ClassValue } from './utils'

const props = withDefaults(
  defineProps<{
    value: string
    class?: ClassValue
  }>(),
  {
    class: ''
  }
)

const tabsCtx = useUITabsCtx()
const active = computed(() => tabsCtx.value.value === props.value)
const rootClass = computed(() =>
  cn(
    'tab flex h-full min-w-0 cursor-pointer items-center overflow-hidden border-b-2 px-md text-xl/8 whitespace-nowrap transition-[color,border-color] duration-200',
    active.value ? 'border-grey-1000 text-grey-1000' : 'border-transparent text-grey-800 hover:text-grey-1000',
    props.class
  )
)
</script>

<template>
  <li
    :class="rootClass"
    @click="tabsCtx.setValue(props.value)"
  >
    <slot />
  </li>
</template>
