<!-- (floating) Footer for Sprite/Sound Panel -->

<template>
  <div class="panel-footer">
    <slot></slot>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.panel-footer {
  flex: 0 0 auto;
  display: flex;
  padding: 12px;
  flex-direction: column;

  background: var(--ui-color-grey-100);
  box-shadow: 0px -2px 8px 0px rgba(51, 51, 51, 0.08); // slightly different with --ui-box-shadow-small
}
</style>
