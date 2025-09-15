<script setup lang="ts">
import UIModalClose from './UIModalClose.vue'

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="header">
    <div class="left"></div>
    <div class="center">
      <slot></slot>
    </div>
    <div class="right">
      <slot name="right"></slot>
      <UIModalClose
        v-radar="{ name: 'Close button', desc: 'Click to close the full screen modal' }"
        class="close"
        @click="emit('close')"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  gap: 32px;
  font-size: 16px;
  border-bottom: 1px solid var(--ui-color-grey-400);
  height: 56px;
  color: var(--ui-color-title);
}

.left {
  flex: 1;
  flex-basis: 30%;
}

.center {
  flex: 1;
  flex-basis: 40%;
  overflow: hidden;
}

.right {
  flex: 1;
  flex-basis: 30%;
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  align-items: center;
  padding-right: 20px;
}
</style>
