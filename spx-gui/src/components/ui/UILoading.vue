<template>
  <div class="ui-loading">
    <NSpin size="large" />
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
  height: 100%;
  max-height: 400px;
  display: flex;
  justify-content: center;
}
</style>
