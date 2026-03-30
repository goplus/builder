<template>
  <div class="container">
    <h4>{{ $t(title) }}</h4>
  </div>
</template>
<script setup lang="ts">
import { usePageTitle } from '@/utils/utils'
import { completeSignIn } from '@/stores/user'
import { getCallbackReturnTo } from './callback-utils'

const title = { en: 'Signing in...', zh: '登录中...' }

usePageTitle(title)

try {
  await completeSignIn()
  window.location.replace(getCallbackReturnTo(location.search))
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
