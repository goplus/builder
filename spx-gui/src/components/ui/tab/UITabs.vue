<template>
  <ul :class="rootClass">
    <slot></slot>
  </ul>
</template>

<script lang="ts">
import { inject, type InjectionKey } from 'vue'

export type TabsCtx = {
  color: Color
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
import { type Color } from '../tokens/colors'
import { computedShallowReactive } from '@/utils/utils'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    color?: Color
    value: string
    class?: ClassValue
  }>(),
  {
    color: 'primary',
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const rootClass = computed(() => cn('flex', props.class))

provide(
  tabsCtxInjectionKey,
  computedShallowReactive(() => ({
    color: props.color,
    value: props.value,
    setValue(value: string) {
      emit('update:value', value)
    }
  }))
)
</script>
