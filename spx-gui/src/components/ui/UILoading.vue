<template>
  <div class="ui-loading" :class="{ cover, visible, mask }">
    <NSpin />
  </div>
</template>

<script setup lang="ts">
import { NSpin } from 'naive-ui'

withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    mask?: boolean
  }>(),
  {
    cover: false,
    visible: true,
    mask: true
  }
)
</script>

<style lang="scss" scoped>
// TODO: loading style not designed yet
.ui-loading {
  width: 100%;
  height: 80%;
  display: flex;
  justify-content: center;
  visibility: hidden;
  opacity: 0;
  transition:
    visibility 0.3s,
    opacity 0.3s;

  &.cover {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;

    &.mask {
      background-color: rgba(255, 255, 255, 0.5);
    }
  }

  &.visible {
    visibility: visible;
    opacity: 1;
  }
}
</style>
