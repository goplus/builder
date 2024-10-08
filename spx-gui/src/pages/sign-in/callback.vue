<template>
  <div class="container">
    <h4>Logging in...</h4>
  </div>
</template>
<script setup lang="ts">
import { useUserStore } from '@/stores'
import { useI18n } from '@/utils/i18n'

const userStore = useUserStore()
const i18n = useI18n()

try {
  const params = new URLSearchParams(location.search)
  const lang = params.get('language')
  if (lang === 'en' || lang === 'zh') {
    i18n.setLang(lang)
  }
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
