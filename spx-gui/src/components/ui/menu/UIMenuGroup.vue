<template>
  <div class="ui-menu-group" :class="{ disabled: disabled }">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { provide, computed } from 'vue'
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
  computed(() => ({
    disabled: props.disabled,
    inGroup: true
  }))
)
</script>

<style lang="scss" scoped>
.ui-menu-group {
  padding: 8px 0px;

  &.disabled {
    // TODO: confirm color details here
    color: var(--ui-color-grey-600);
    background-color: var(--ui-color-disabled);
  }
}

.ui-menu-group + .ui-menu-group {
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
