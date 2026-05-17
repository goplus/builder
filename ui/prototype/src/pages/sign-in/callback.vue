<template>
  <div class="flex h-screen items-center justify-center">
    <h4 class="m-0 text-base font-normal text-title">Signing in...</h4>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  document.title = 'Signing in... - XBuilder'

  const params = new URLSearchParams(location.search)
  const returnTo = params.get('returnTo')

  window.setTimeout(() => {
    window.location.replace(returnTo != null ? returnTo : '/')
  }, 300)
})
</script>
