<template>
  <div v-bind="rootAttrs" :class="rootClass">
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
import { computed, useAttrs } from 'vue'
import { cn, type ClassValue } from '../utils'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const rootClass = computed(() => cn('p-2', attrs.class as ClassValue | null))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

provide(ctxKey, { disabled: false, inGroup: false })
</script>
