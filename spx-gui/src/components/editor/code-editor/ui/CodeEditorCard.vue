<template>
  <div class="code-editor-card">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.code-editor-card {
  border-radius: var(--ui-border-radius-1);
  background: var(--ui-color-grey-100);
  box-shadow: 0px 8px 28px 8px rgba(36, 41, 47, 0.08);
}
</style>
