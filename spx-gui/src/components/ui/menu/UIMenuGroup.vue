<template>
  <div class="ui-menu-group">
    <slot></slot>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.ui-menu-group {
  padding: 8px 0px;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }
}

.ui-menu-group + .ui-menu-group {
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
