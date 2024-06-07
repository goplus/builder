<template>
  <ul class="ui-tabs">
    <slot></slot>
  </ul>
</template>

<script lang="ts">
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
import { type InjectionKey, inject, provide } from 'vue'
import { type Color } from '../tokens/colors'
import { computedShallowReactive } from '@/utils/utils'

const props = withDefaults(
  defineProps<{
    color?: Color
    value: string
  }>(),
  {
    color: 'primary'
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

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

<style lang="scss" scoped>
.ui-tabs {
  display: flex;
}
</style>
