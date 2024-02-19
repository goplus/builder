<template>
  <div class="container">
    <h4>Loggin in...</h4>
  </div>
</template>
<script setup lang="ts">
import { useTokenStore } from '@/store'
import { casdoorSdk } from '@/util/casdoor'

const userStore = useTokenStore()

const tokenResp = await casdoorSdk.exchangeForAccessToken()
console.log('tokenResp', tokenResp)
userStore.setToken(tokenResp)

// window.location.replace('/')
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
