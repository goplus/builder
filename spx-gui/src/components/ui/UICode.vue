<template>
  <code class="ui-code">
    <slot></slot>
  </code>
</template>

<style lang="scss" scoped>
.ui-code {
  padding: 2px 4px;
  font-size: 10px;
  font-family: var(--ui-font-family-code);
  line-height: 1.6;
  color: var(--ui-color-primary-main);
  background-color: var(--ui-color-primary-200);
  border-radius: 4px;
}
</style>
