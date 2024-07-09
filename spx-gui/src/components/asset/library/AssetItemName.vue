<template>
  <div class="asset-item-name-container">
    <h5 class="asset-item-name">
      <slot></slot>
    </h5>
  </div>
</template>

<style scoped lang="scss">
.asset-item-name {
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  padding: 0 8px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}

.asset-item-name-container {
  height: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
}
</style>
