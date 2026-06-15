<template>
  <UIError v-if="request == null" class="min-h-screen bg-grey-100">
    {{ $t({ en: 'Unable to start sign-in', zh: '无法登录' }) }}
    <template #sub-message>
      {{
        $t({
          en: 'Missing OAuth request. Please restart sign-in from the app.',
          zh: '缺少 OAuth 请求信息，请从应用内重新发起登录。'
        })
      }}
    </template>
  </UIError>
  <SignIn v-else :request="request" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import { normalizeLang, useI18n } from '@/utils/i18n'
import { usePageTitle } from '@/utils/utils'
import type { OAuthRequest } from '@/apis/account'
import SignIn from '@/components/account/sign-in/SignIn.vue'
import { UIError } from '@/components/ui'

const route = useRoute()
const i18n = useI18n()

watch(
  () => route.query.uiLocales,
  (uiLocales) => {
    if (typeof uiLocales === 'string' && uiLocales.trim() !== '') {
      i18n.setLang(normalizeLang(uiLocales))
    }
  },
  { immediate: true }
)

const request = computed<OAuthRequest | null>(() => {
  const clientId = typeof route.query.clientID === 'string' ? route.query.clientID.trim() : ''
  const requestUri = typeof route.query.requestURI === 'string' ? route.query.requestURI.trim() : ''
  if (clientId === '' || requestUri === '') return null
  return { clientId, requestUri }
})

usePageTitle({ en: 'Sign in', zh: '登录' })
</script>
