<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-15 py-10">
    <div class="mb-12">
      <img class="h-auto w-60" :src="imgDesktopRequired" alt="Desktop Required Image" />
    </div>
    <div class="mb-10 text-center">
      <h1 class="mb-3 text-20 font-semibold text-grey-1000">
        {{ t({ en: 'Please visit on desktop', zh: '请在电脑上访问' }) }}
      </h1>
      <p class="text-body text-grey-900">
        {{
          t({
            en: 'XBuilder is designed for desktop devices. Please visit this page on your computer for the full experience.',
            zh: 'XBuilder 为桌面设备设计，请在电脑浏览器中访问以获得完整体验。'
          })
        }}
      </p>
    </div>
    <UIButton
      v-if="isClipboardSupported"
      v-radar="{ name: 'Copy Link', desc: 'Button to copy the page URL' }"
      size="large"
      icon="copy"
      @click="handleCopy"
    >
      {{ t({ en: 'Copy link', zh: '复制链接' }) }}
    </UIButton>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/utils/i18n'
import imgDesktopRequired from './desktop-required.png'
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const { t } = useI18n()

const isClipboardSupported = !!navigator.clipboard

const handleCopy = useMessageHandle(
  () => navigator.clipboard.writeText(window.location.href),
  { en: 'Failed to copy URL to clipboard', zh: '复制到剪贴板失败' },
  { en: 'Copied to clipboard', zh: '已复制到剪贴板' }
).fn
</script>
