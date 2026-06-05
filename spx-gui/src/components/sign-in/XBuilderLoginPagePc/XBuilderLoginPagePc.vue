<template>
  <div class="page">
    <div class="panel relative h-150 w-250 rounded-[16px] py-18 flex items-stretch justify-center">
      <h1 class="absolute left-15 top-8 m-0 text-[26px]/9 text-title">{{ $t({ en: 'Sign In', zh: '登录' }) }}</h1>
      <div class="illustration flex-1"></div>
      <div class="flex-1 flex flex-col items-center justify-center">
        <img :src="logoUrl" alt="XBuilder" class="w-18 mb-3" />
        <h2 class="mb-16 text-title text-[24px]/7 font-semibold">XBuilder</h2>
        <LoginForm class="px-[85px]" :auth-context="authContext" />
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
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #eff3fd;
  background-image: url('./bg.svg');
  background-position: center;
  background-size: 100%;
  background-repeat: no-repeat;
}

.panel {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 16px 32px -12px rgba(64, 186, 196, 0.18);
}

.illustration {
  background-image: url('./illustration.svg');
  background-position: center;
  background-size: 472px;
  background-repeat: no-repeat;
  border-right: 1px solid #e0e7ef;
}
</style>
