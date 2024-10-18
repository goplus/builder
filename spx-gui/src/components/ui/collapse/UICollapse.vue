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
const props = withDefaults(
  defineProps<{
    defaultExpandedNames?: string[]
  }>(),
  {
    defaultExpandedNames: () => []
  }
)

const expandedNames = ref(props.defaultExpandedNames)

provide(collapseCtxKey, { expandedNames })
</script>

<template>
  <ul class="ui-collapse">
    <slot></slot>
  </ul>
</template>

<style lang="scss" scoped>
.ui-collapse {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
