<script lang="ts" setup></script>

<template>
  <div class="config-panel">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.config-panel {
  width: fit-content;
  height: 36px;
  border: 2px solid var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-big);
}
</style>
