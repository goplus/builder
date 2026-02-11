<template>
  <div class="mobile-reminder">
    <div v-if="showCopiedMessage" class="copied-message">
      <UIIcon type="success" />
      <span>{{ t({ en: 'Copied to clipboard!', zh: '已复制到剪贴板！' }) }}</span>
    </div>
    <div class="guide-img">
      <img :src="imgDesktopRequired" alt="Desktop Required Image" />
    </div>
    <div class="guide-text">
      <h1>{{ t({ en: 'Desktop Required', zh: '访问限制' }) }}</h1>
      <p>
        {{
          t({
            en: 'This application is not supported on mobile devices. Please access it from a desktop.',
            zh: '该应用暂不支持移动端，请使用电脑访问'
          })
        }}
      </p>
    </div>
    <UIButton
      v-if="isClipboardSupported"
      v-radar="{ name: 'Copy Access URL', desc: 'Button to copy the access URL' }"
      size="large"
      icon="copy"
      @click="copyAccessUrl"
    >
      {{ t({ en: 'Copy Access URL', zh: '复制访问地址' }) }}
    </UIButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/utils/i18n'
import imgDesktopRequired from './desktop-required.png'
import { UIButton, UIIcon } from '@/components/ui'

const { t } = useI18n()

const isClipboardSupported = !!navigator.clipboard
const showCopiedMessage = ref(false)

function copyAccessUrl() {
  if (!navigator.clipboard) return
  const url = window.location.href
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showCopiedMessage.value = true
      setTimeout(() => {
        showCopiedMessage.value = false
      }, 2000)
    })
    .catch((e) => {
      // TODO: show error message to user ?
      console.error('Failed to copy URL:', url, e)
    })
}
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

  .copied-message {
    position: fixed;
    top: 40px;
    z-index: 1000;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--ui-color-grey-900);
    animation: fade-in-out 2s forwards;
  }
}
</style>
