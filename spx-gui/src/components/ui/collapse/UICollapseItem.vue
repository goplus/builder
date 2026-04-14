<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIIcon from '../icons/UIIcon.vue'
import { useCollapseCtx } from './UICollapse.vue'

const props = defineProps<{
  title: string
  name: string
  class?: ClassValue
}>()

const collapseCtx = useCollapseCtx()

const expanded = computed(() => collapseCtx.expandedNames.value.includes(props.name))
const rootClass = computed(() => cn('flex flex-col', props.class))

function handleToggle() {
  collapseCtx.expandedNames.value = expanded.value
    ? collapseCtx.expandedNames.value.filter((name) => name !== props.name)
    : [...collapseCtx.expandedNames.value, props.name]
}
</script>

<template>
  <li class="ui-collapse-item" :class="rootClass">
    <header
      class="flex cursor-pointer items-center justify-between [transition:margin-bottom_0.3s]"
      :class="expanded ? 'mb-2' : null"
      @click="handleToggle"
    >
      <h5 class="text-16 text-title">{{ title }}</h5>
      <UIIcon
        class="h-4 w-4 text-hint-1 transition-transform duration-300"
        :class="expanded ? 'rotate-0' : 'rotate-180'"
        type="arrowAlt"
      />
    </header>
    <main
      class="h-0 flex-none overflow-hidden opacity-0 invisible [transition:visibility_0s,opacity_0.2s,height_0.3s]"
      :class="expanded ? 'visible h-fit opacity-100' : null"
    >
      <slot></slot>
    </main>
  </li>
</template>

<style>
@layer components {
  .ui-collapse-item + .ui-collapse-item::before {
    content: '';
    display: block;
    height: 1px;
    background: var(--ui-color-grey-400);
    margin: 16px 0;
  }
}
</style>
