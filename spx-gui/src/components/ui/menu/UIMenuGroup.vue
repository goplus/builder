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
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ui-menu-group + .ui-menu-group {
  margin-top: 13px;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 0;
    width: 100%;
    height: 0;
    border-top: 1px solid var(--ui-color-dividing-line-2);
  }
}
</style>
