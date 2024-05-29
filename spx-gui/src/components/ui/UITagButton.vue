<template>
  <button class="ui-tag-button">
    <slot></slot>
  </button>
</template>

<style lang="scss" scoped>
.ui-tag-button {
  display: flex;
  width: fit-content;
  align-items: center;
  height: 32px;
  padding: 4px 12px;
  color: var(--ui-color-text);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-border);
  border-bottom-width: 3px;
  border-radius: 50px;
  cursor: pointer;

  &:active {
    border-bottom-width: 1px;
  }
}
</style>
