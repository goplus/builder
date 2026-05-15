<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  document.title = 'Page not found - XBuilder'
})
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-grey-300 p-8">
    <section class="w-full max-w-120 rounded-lg border border-grey-400 bg-grey-100 p-8 text-center">
      <h1 class="m-0 text-2xl font-medium text-title">Page not found</h1>
      <p class="mt-2 text-sm text-hint-1">This offline prototype route is not available.</p>
      <RouterLink class="mt-5 inline-flex rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white no-underline" to="/">
        Back home
      </RouterLink>
    </section>
  </main>
</template>
