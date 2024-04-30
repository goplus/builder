<template>
  <div class="ui-menu">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { type InjectionKey, type ComputedRef, provide, computed } from 'vue'
export type MenuCtx = {
  disabled: boolean
  inGroup: boolean
}
export const ctxKey: InjectionKey<ComputedRef<MenuCtx>> = Symbol('menu-ctx')
</script>

<script setup lang="ts">
const ctx = computed(() => ({ disabled: false, inGroup: false }))
provide(ctxKey, ctx)
</script>
