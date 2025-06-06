<template>
  <div class="container">
    <h4>{{ $t(title) }}</h4>
  </div>
</template>
<script setup lang="ts">
import { usePageTitle } from '@/utils/utils'
import { useUserStore } from '@/stores/user'

const title = { en: 'Signing in...', zh: '登录中...' }

usePageTitle(title)

const userStore = useUserStore()

try {
  const params = new URLSearchParams(location.search)

  await userStore.completeSignIn()

  const returnTo = params.get('returnTo')
  window.location.replace(returnTo != null ? returnTo : '/')
} catch (e) {
  console.error('failed to complete sign-in', e)
  window.location.replace('/')
}
</script>
<style scoped lang="scss">
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
