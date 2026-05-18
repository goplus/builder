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
    class="tab flex cursor-pointer items-center border-b-2 px-md pb-1.5 pt-md text-xl/8 transition-[color,border-color] duration-200"
    :class="[
      active ? 'border-grey-1000 text-grey-1000' : 'border-transparent text-grey-800 hover:text-grey-1000',
      props.class
    ]"
    @click="tabsCtx.setValue(props.value)"
  >
    <slot />
  </li>
</template>
