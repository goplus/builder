<template>
  <div class="ui-loading">
    <NSpin />
  </div>
</template>

<script setup lang="ts">
import { NSpin } from 'naive-ui'
</script>

<style lang="scss" scoped>
// TODO: loading style not designed yet
.ui-loading {
  flex: 1 1 auto;
  width: 100%;
  height: 80%;
  display: flex;
  justify-content: center;
}
</style>
