<template>
  <div class="ui-menu-group" :class="rootClass">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import { cn, type ClassValue } from '../utils'
import { ctxKey } from './UIMenu.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    class?: ClassValue
  }>(),
  {
    disabled: false,
    class: undefined
  }
)

const rootClass = computed(() => cn('flex flex-col gap-1', props.class ?? null))

provide(
  ctxKey,
  computedShallowReactive(() => ({
    disabled: props.disabled,
    inGroup: true
  }))
)
</script>

<style>
@layer components {
  .ui-menu-group + .ui-menu-group {
    margin-top: 13px;
    position: relative;
  }

  .ui-menu-group + .ui-menu-group::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 0;
    width: 100%;
    height: 0;
    border-top: 1px solid var(--ui-color-dividing-line-2);
  }
}
</style>
