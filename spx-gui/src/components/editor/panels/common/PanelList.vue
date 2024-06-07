<!-- List for Sprite/Sound Panel -->

<template>
  <ul class="panel-list">
    <slot></slot>
  </ul>
</template>

<style scoped lang="scss">
.panel-list {
  flex: 1 1 0;
  overflow-y: auto;
  margin: 0;
  padding: 12px 0 12px 12px; // no right padding to allow optional scrollbar
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
}
</style>
