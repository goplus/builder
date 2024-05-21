<template>
  <h5 class="editor-item-name">
    <slot></slot>
  </h5>
</template>

<style lang="scss" scoped>
.editor-item-name {
  font-size: 10px;
  line-height: 1.6;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
