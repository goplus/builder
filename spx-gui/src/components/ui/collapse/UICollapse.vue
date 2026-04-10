<script lang="ts">
import { inject, provide, type InjectionKey, ref, type Ref } from 'vue'

export type CollapseCtx = {
  expandedNames: Ref<string[]>
}

export const collapseCtxKey: InjectionKey<CollapseCtx> = Symbol('collapse-ctx')
export function useCollapseCtx() {
  const ctx = inject(collapseCtxKey)
  if (ctx == null) throw new Error('useCollapseCtx should be called inside of Collapse')
  return ctx
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    defaultExpandedNames?: string[]
    class?: ClassValue
  }>(),
  {
    defaultExpandedNames: () => [],
    class: undefined
  }
)

const expandedNames = ref(props.defaultExpandedNames)
const rootClass = computed(() => cn('m-0 flex list-none flex-col p-0', props.class ?? null))

provide(collapseCtxKey, { expandedNames })
</script>

<template>
  <ul :class="rootClass">
    <slot></slot>
  </ul>
</template>
