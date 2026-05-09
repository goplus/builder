<template>
  <div :class="cn('p-2', props.class)">
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
import { cn, type ClassValue } from '../utils'

const props = defineProps<{
  class?: ClassValue
}>()

provide(ctxKey, { disabled: false, inGroup: false })
</script>
