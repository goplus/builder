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

const props = withDefaults(
  defineProps<{
    value: string
    class?: string
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
</script>

<template>
  <ul class="flex gap-6 px-2" :class="props.class">
    <slot />
  </ul>
</template>
