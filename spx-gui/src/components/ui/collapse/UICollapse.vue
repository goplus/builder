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
import { computed, useAttrs } from 'vue'
import { cn, type ClassValue } from '../utils'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    defaultExpandedNames?: string[]
  }>(),
  {
    defaultExpandedNames: () => []
  }
)

const expandedNames = ref(props.defaultExpandedNames)
const attrs = useAttrs()
const rootClass = computed(() => cn('m-0 flex list-none flex-col p-0', attrs.class as ClassValue | null))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

provide(collapseCtxKey, { expandedNames })
</script>

<template>
  <ul v-bind="rootAttrs" :class="rootClass">
    <slot></slot>
  </ul>
</template>
