<template>
  <div class="page">
    <div class="shell">
      <div class="w-[295px] pb-15 flex flex-col items-center justify-center">
        <img :src="logoUrl" alt="XBuilder" class="w-18 mb-3" />
        <h2 class="mb-16 text-title text-[24px]/7 font-semibold">XBuilder</h2>
        <LoginForm :auth-context="authContext" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OAuthContext } from '@/utils/account/sign-in'
import logoUrl from '@/components/sign-in/assets/logo.svg'
import LoginForm from '../LoginForm.vue'

defineProps<{
  authContext: OAuthContext
}>()
</script>

<style scoped>
.page {
  width: 100%;
  min-height: 100vh;
  background-color: #eff3fd;
  background-image: url('./bg-mobile.svg');
  background-position: center;
  background-size: 100%;
  background-repeat: no-repeat;
}

.shell {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: url('./illustration-mobile.svg');
  background-position: top;
  background-size: 100%;
  background-repeat: no-repeat;
}
</style>
