<template>
  <h5 class="asset-item-name">
    <slot></slot>
  </h5>
</template>

<style scoped lang="scss">
.asset-item-name {
  font-size: var(--ui-font-size-text);
  line-height: 1.57143;
  padding: 0 8px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
