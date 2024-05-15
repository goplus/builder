<template>
  <span class="asset-name">
    <slot></slot>
  </span>
</template>

<style scoped lang="scss">
.asset-name {
  max-width: 16em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
