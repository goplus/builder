<template>
  <div class="ui-menu">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { type InjectionKey, type ComputedRef, provide, computed } from 'vue'
export const disabledKey: InjectionKey<ComputedRef<boolean>> = Symbol('disabled')
</script>

<script setup lang="ts">
// avoid `[Vue warn]: injection "Symbol(disabled)" not found`
const disabled = computed(() => false)
provide(disabledKey, disabled)
</script>
