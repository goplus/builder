<script lang="ts">
import { inject, type ComputedRef, type InjectionKey } from 'vue'

export type UITabsCtx = {
  value: ComputedRef<string>
  setValue(value: string): void
}

const prototypeTabsCtxKey: InjectionKey<UITabsCtx> = Symbol('prototype-tabs-ctx')

export function useUITabsCtx() {
  const tabsCtx = inject(prototypeTabsCtxKey)
  if (tabsCtx == null) throw new Error('UITab must be used inside UITabs')
  return tabsCtx
}
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

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

const emit = defineEmits<{
  'update:value': [string]
}>()

provide(prototypeTabsCtxKey, {
  value: computed(() => props.value),
  setValue(value: string) {
    emit('update:value', value)
  }
})

const rootClass = computed(() => cn('m-0 flex min-w-0 list-none overflow-hidden px-2', props.class))
</script>

<template>
  <ul :class="rootClass">
    <slot />
  </ul>
</template>
