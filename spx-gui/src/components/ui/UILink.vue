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
.ui-link {
  transition: color 0.1s;

  &.type-primary {
    color: var(--ui-color-primary-main);
    text-decoration: none;

    &:hover {
      color: var(--ui-color-primary-400);
    }

    &:active {
      color: var(--ui-color-primary-600);
    }
  }

  &.type-boring {
    color: inherit;

    &:hover {
      color: var(--ui-color-primary-main);
    }

    &:active {
      color: var(--ui-color-primary-600);
    }
  }
}
</style>
