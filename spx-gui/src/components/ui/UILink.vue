<script setup lang="ts">
withDefaults(
  defineProps<{
    href?: string
    type?: 'primary' | 'boring'
  }>(),
  {
    href: 'javascript:;',
    type: 'primary'
  }
)
</script>

<template>
  <a class="ui-link" :class="`type-${type}`" :href="href">
    <slot></slot>
  </a>
</template>

<style lang="scss" scoped>
@import './link.scss';

.ui-link {
  &.type-primary {
    @include link(primary);
  }
  &.type-boring {
    @include link(boring);
  }
}
</style>
