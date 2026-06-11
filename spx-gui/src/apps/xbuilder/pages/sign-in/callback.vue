<template>
  <div class="h-screen flex items-center justify-center">
    <h4>{{ $t(title) }}</h4>
  </div>
</template>
<script setup lang="ts">
import { usePageTitle } from '@/utils/utils'
import { completeSignIn } from '@/stores/user'

const title = { en: 'Signing in...', zh: '登录中...' }

usePageTitle(title)

try {
  const { returnTo } = await completeSignIn(window.location.search)
  window.location.replace(returnTo !== '' ? returnTo : '/')
} catch (e) {
  console.error('failed to complete sign-in', e)
  window.location.replace('/')
}
</script>
