<script setup lang="ts">
import { computed } from 'vue'

import { useUITabsCtx } from './UITabs.vue'

const props = withDefaults(
  defineProps<{
    value: string
    class?: string
  }>(),
  {
    class: ''
  }
)

const tabsCtx = useUITabsCtx()
const active = computed(() => tabsCtx.value.value === props.value)
</script>

<template>
  <li
    class="tab flex h-full min-w-0 cursor-pointer items-center overflow-hidden border-b-2 px-md text-xl/8 whitespace-nowrap transition-[color,border-color] duration-200"
    :class="[
      active ? 'border-grey-1000 text-grey-1000' : 'border-transparent text-grey-800 hover:text-grey-1000',
      props.class
    ]"
    @click="tabsCtx.setValue(props.value)"
  >
    <slot />
  </li>
</template>
