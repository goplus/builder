<template>
  <div class="ui-loading" :class="{ cover }">
    <NSpin />
  </div>
</template>

<script setup lang="ts">
import { NSpin } from 'naive-ui'

withDefaults(
  defineProps<{
    cover?: boolean
  }>(),
  {
    cover: false
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

  &.cover {
    position: absolute;
    z-index: 100;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.5);
  }
}
</style>
