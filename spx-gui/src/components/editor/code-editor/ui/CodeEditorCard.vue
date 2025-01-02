<template>
  <div class="code-editor-card">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.code-editor-card {
  border-radius: var(--ui-border-radius-1);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-grey-400); // debug purpose, TODO: remove me
  box-shadow: 0px 16px 32px -12px rgba(14, 18, 27, 0.1);
}
</style>
