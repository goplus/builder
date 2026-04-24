<template>
  <div :class="rootClass">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { type InjectionKey, provide } from 'vue'
export type MenuCtx = {
  disabled: boolean
  inGroup: boolean
}
export const ctxKey: InjectionKey<MenuCtx> = Symbol('menu-ctx')
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'

const props = defineProps<{
  class?: ClassValue
}>()

const rootClass = computed(() => cn('p-2', props.class))

provide(ctxKey, { disabled: false, inGroup: false })
</script>
