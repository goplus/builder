<template>
  <div class="mobile-reminder">
    <div class="guide-img">
      <img :src="imgDesktopRequired" alt="Desktop Required Image" />
    </div>
    <div class="guide-text">
      <h1>{{ t({ en: 'Please visit on desktop', zh: '请在电脑上访问' }) }}</h1>
      <p>
        {{
          t({
            en: 'XBuilder is designed for desktop devices. Please visit this page on your computer for the full experience.',
            zh: 'XBuilder 专为桌面端设计，请在电脑浏览器中访问以获得完整体验'
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

<style lang="scss" scoped>
.mobile-reminder {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;

  .guide-img {
    margin-bottom: 48px;
    img {
      width: 240px;
      height: auto;
    }
  }

  .guide-text {
    margin-bottom: 40px;
    text-align: center;

    h1 {
      font-size: 20px;
      font-weight: 600;
      color: var(--ui-color-grey-1000);
      margin-bottom: 12px;
    }

    p {
      font-size: 14px;
      line-height: 22px;
      color: var(--ui-color-grey-900);
    }
  }
}
</style>
