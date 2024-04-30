<template>
  <div class="container">
    <h4>Logging in...</h4>
  </div>
</template>
<script setup lang="ts">
import { useUserStore } from '@/stores'

const userStore = useUserStore()

try {
  await userStore.consumeCurrentUrl()
} finally {
  window.location.replace('/')
}
</script>
<style scoped lang="scss">
// Center the text
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
