<script setup lang="ts">
import { computed } from 'vue'

import type { IdentityProvider } from '@/apis/account'
import type { LocaleMessage } from '@/utils/i18n'
import { spacingLocaleZhMessage } from '@/utils/utils'
import { UIFullWidthButton } from '@/components/ui'

import googleProviderLogoColorful from './google-colorful.svg'
import googleProviderMonochromeLogo from './google-monochrome.svg'
import githubProviderLogoColorful from './github-colorful.svg'
import githubProviderMonochromeLogo from './github-monochrome.svg'
import xProviderLogoColorful from './x-colorful.svg'
import xProviderMonochromeLogo from './x-monochrome.svg'
import qqProviderLogoColorful from './qq-colorful.svg'
import qqProviderMonochromeLogo from './qq-monochrome.svg'
import wechatProviderLogoColorful from './wechat-colorful.svg'
import wechatProviderMonochromeLogo from './wechat-monochrome.svg'

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
  if (logos == null) return null
  return props.primary ? logos.monochrome : logos.colorful
})

const signInMessage = computed<LocaleMessage>(() => {
  const { displayName } = props.provider
  return spacingLocaleZhMessage({
    en: `Sign in with ${displayName}`,
    zh: `使用${displayName}登录`
  })
})
</script>

<template>
  <UIFullWidthButton :primary="primary" :disabled="disabled" :img-src="logo" @click="$emit('click')">
    {{ $t(signInMessage) }}
  </UIFullWidthButton>
</template>
