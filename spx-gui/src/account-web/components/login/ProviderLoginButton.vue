<template>
  <LoginButton :primary="primary" :disabled="disabled" :img-src="logo" @click="$emit('click')">
    {{ loginText }}
  </LoginButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import type { IdentityProvider } from '@/account-web/apis/account'
import googleProviderLogoColorful from '@/account-web/assets/providers/google-colorful.svg'
import googleProviderMonochromeLogo from '@/account-web/assets/providers/google-monochrome.svg'
import githubProviderLogoColorful from '@/account-web/assets/providers/github-colorful.svg'
import githubProviderMonochromeLogo from '@/account-web/assets/providers/github-monochrome.svg'
import xProviderLogoColorful from '@/account-web/assets/providers/x-colorful.svg'
import xProviderMonochromeLogo from '@/account-web/assets/providers/x-monochrome.svg'
import qqProviderLogoColorful from '@/account-web/assets/providers/qq-colorful.svg'
import qqProviderMonochromeLogo from '@/account-web/assets/providers/qq-monochrome.svg'
import wechatProviderLogoColorful from '@/account-web/assets/providers/wechat-colorful.svg'
import wechatProviderMonochromeLogo from '@/account-web/assets/providers/wechat-monochrome.svg'
import LoginButton from './LoginButton.vue'

const props = withDefaults(
  defineProps<{
    provider: IdentityProvider
    primary?: boolean
    disabled?: boolean
  }>(),
  {
    primary: false,
    disabled: false
  }
)

defineEmits<{
  click: []
}>()

type Logos = {
  colorful: string
  monochrome: string
}

const providerTypeLogosMap: Record<string, Logos> = {
  google: {
    colorful: googleProviderLogoColorful,
    monochrome: googleProviderMonochromeLogo
  },
  github: {
    colorful: githubProviderLogoColorful,
    monochrome: githubProviderMonochromeLogo
  },
  twitter: {
    colorful: xProviderLogoColorful,
    monochrome: xProviderMonochromeLogo
  },
  x: {
    colorful: xProviderLogoColorful,
    monochrome: xProviderMonochromeLogo
  },
  qq: {
    colorful: qqProviderLogoColorful,
    monochrome: qqProviderMonochromeLogo
  },
  wechat: {
    colorful: wechatProviderLogoColorful,
    monochrome: wechatProviderMonochromeLogo
  }
}

const logo = computed(() => {
  const logos = providerTypeLogosMap[props.provider.name.toLowerCase()]
  if (logos == null) return undefined
  return props.primary ? logos.monochrome : logos.colorful
})

const i18n = useI18n()

const loginText = computed(() => {
  const { displayName } = props.provider
  if (i18n.lang.value === 'zh') {
    const zhSep = /^[a-zA-Z]+$/.test(displayName) ? ' ' : ''
    return ['使用', displayName, '登录'].join(zhSep)
  }
  return `Sign in with ${displayName}`
})
</script>
