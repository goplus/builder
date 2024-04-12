<template>
  <div class="ui-panel">
    <slot></slot>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.ui-panel {
  box-shadow: var(--ui-box-shadow-diffusion);
  border-radius: var(--ui-border-radius-3);
  background-color: var(--ui-color-grey-100);
}
</style>
