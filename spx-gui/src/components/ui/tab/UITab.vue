<template>
  <li :class="rootClass" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'
import { useTabsCtx } from './UITabs.vue'

const props = defineProps<{
  value: string
  class?: ClassValue
}>()

const tabsCtx = useTabsCtx()
const active = computed(() => tabsCtx.value === props.value)
const rootClass = computed(() =>
  cn(
    'flex cursor-pointer items-center border-b-2 border-transparent px-md pt-md pb-1.5 text-xl/8 text-grey-800 transition-[color,border-color] duration-200',
    active.value ? 'border-grey-1000 text-grey-1000' : 'hover:text-grey-1000',
    props.class ?? null
  )
)

function handleClick() {
  tabsCtx.setValue(props.value)
}
</script>
