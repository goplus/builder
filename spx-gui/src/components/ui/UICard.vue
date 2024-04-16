<template>
  <div class="ui-card">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.ui-card {
  box-shadow: var(--ui-box-shadow-diffusion);
  border-radius: var(--ui-border-radius-2);
  background-color: var(--ui-color-grey-100);
  overflow: hidden;
}
</style>
