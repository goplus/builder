<!-- Header for Sprite/Sound/Stage Editor -->

<template>
  <div class="editor-header">
    <slot></slot>
    <div class="extra">
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.editor-header {
  height: 44px;
  display: flex;
  padding-right: var(--ui-gap-middle);
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--ui-color-grey-400);
}
</style>
