<template>
  <div class="ui-menu-item">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)
</script>

<style lang="scss" scoped>
.ui-menu-item {
  padding: 8px 12px;
  line-height: 24px;
  cursor: pointer;

  &:hover {
    // TODO: recheck color here
    background-color: var(--ui-color-grey-400);
  }
}
</style>
