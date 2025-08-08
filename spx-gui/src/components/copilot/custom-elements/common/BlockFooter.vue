<script setup lang="ts"></script>

<template>
  <footer class="block-footer">
    <slot></slot>
  </footer>
</template>

<style lang="scss" scoped>
.block-footer {
  padding: 6px 12px;
  display: flex;
  gap: 20px;
  align-items: center;
  border-top: 1px solid var(--ui-color-dividing-line-2);
  border-radius: 0 0 var(--ui-border-radius-2) var(--ui-border-radius-2);
  background: var(--ui-color-grey-200);
}
</style>
