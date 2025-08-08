<script setup lang="ts"></script>

<template>
  <div class="block-wrapper">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.block-wrapper {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  align-self: stretch;

  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-dividing-line-1);
  background: var(--ui-color-grey-100);
}
</style>
