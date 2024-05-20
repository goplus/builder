<template>
  <div class="ui-menu-group">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import { ctxKey } from './UIMenu.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

provide(
  ctxKey,
  computedShallowReactive(() => ({
    disabled: props.disabled,
    inGroup: true
  }))
)
</script>

<style lang="scss" scoped>
.ui-menu-group {
  padding: 8px 0px;
}

.ui-menu-group + .ui-menu-group {
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
