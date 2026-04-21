<template>
  <ul :class="rootClass">
    <slot></slot>
  </ul>
</template>

<script lang="ts">
import { inject, type InjectionKey } from 'vue'

export type TabsCtx = {
  value: string
  setValue(value: string): void
}
const tabsCtxInjectionKey: InjectionKey<TabsCtx> = Symbol('tabs-ctx')
export function useTabsCtx() {
  const tabsCtx = inject(tabsCtxInjectionKey)
  if (tabsCtx == null) throw new Error('useTabsCtx should be called inside of UITabs')
  return tabsCtx
}
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    value: string
    class?: ClassValue
  }>(),
  {
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const rootClass = computed(() => cn('flex gap-6 px-2', props.class ?? null))

provide(
  tabsCtxInjectionKey,
  computedShallowReactive(() => ({
    value: props.value,
    setValue(value: string) {
      emit('update:value', value)
    }
  }))
)
</script>
