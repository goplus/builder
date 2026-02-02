<script lang="ts" setup></script>

<template>
  <div class="gen-panel">
    <div class="left">
      <slot name="left"></slot>
    </div>
    <div class="right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gen-panel {
  display: flex;

  .left {
    flex: 1 0 44%;
    padding: 16px;
    overflow: hidden;
    border-right: 1px solid var(--ui-color-grey-400);
  }

  .right {
    flex: 1 0 56%;
    display: flex;
  }
}
</style>
