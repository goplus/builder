<script setup lang="ts">
import { useRouter } from 'vue-router'

import { UIButton } from '@/components/ui'
import errorSvg from './error.svg?raw'

const router = useRouter()
</script>

<template>
  <div v-radar="{ name: '404 page', desc: 'Displayed when a page is not found' }" class="not-found">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="errorSvg"></div>
    <p class="tips">{{ $t({ en: 'Page not found', zh: '页面未找到' }) }}</p>
    <UIButton
      v-radar="{ name: '404 go home button', desc: 'Button to go back to home page' }"
      class="go-home"
      @click="router.replace('/')"
      >{{ $t({ en: 'GO HOME', zh: '回到首页' }) }}</UIButton
    >
  </div>
</template>

<style scoped lang="scss">
.not-found {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  width: 100%;
  justify-content: center;
  align-items: center;
  background: var(--ui-color-grey-200);
}

.tips {
  font-size: 20px;
  font-weight: 600;
  color: var(--ui-color-grey-1000);
}

.go-home {
  width: 122px;
  height: 36px;
  font-size: 15px;
  margin-top: 16px;
}
</style>
