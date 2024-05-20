<template>
  <div class="ui-menu">
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
provide(ctxKey, { disabled: false, inGroup: false })
</script>
