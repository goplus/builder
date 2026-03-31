<template>
  <UIDialog
    type="warning"
    size="small"
    :title="$t({ en: 'Browser Version Unsupported', zh: '浏览器版本不支持' })"
    :visible="visible"
    :mask-closable="true"
    @update:visible="visible = $event"
  >
    <div>{{ $t(content) }}</div>

    <footer class="mt-6 flex justify-end gap-3">
      <UIButton
        v-radar="{
          name: 'Do not show again button',
          desc: 'Click to close browser version reminder modal and suppress it show again.'
        }"
        color="boring"
        @click="handleDoNotShowAgain"
      >
        {{ $t({ en: 'Do not show again', zh: '不再提示' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Confirm button', desc: 'Click to close browser version reminder modal' }"
        color="primary"
        @click="handleConfirm"
      >
        {{ $t({ en: 'Got it', zh: '我知道了' }) }}
      </UIButton>
    </footer>
  </UIDialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type LocaleMessage } from '@/utils/i18n'
import { UIDialog, UIButton } from '@/components/ui'
import { checkBrowserVersion } from './browser-version'

const fallbackMessage: LocaleMessage = {
  en: 'Your browser version may not support all features. Please update your browser for the best experience.',
  zh: '您的浏览器版本可能无法支持全部功能，建议更新浏览器以获得最佳体验。'
}

const visible = ref(false)
const content = ref(fallbackMessage)

const localStorageKey = 'spx-gui-browser-version-reminder-ignored'

function handleDoNotShowAgain() {
  visible.value = false
  try {
    localStorage.setItem(localStorageKey, 'true')
  } catch (e) {
    console.warn('Failed to save preference:', e)
  }
}

function handleConfirm() {
  visible.value = false
}

onMounted(() => {
  let isIgnored = false
  try {
    isIgnored = localStorage.getItem(localStorageKey) === 'true'
  } catch (e) {
    console.warn('Failed to read localStorage:', e)
  }
  if (isIgnored) return

  const checkResult = checkBrowserVersion()
  if (checkResult.ok) return

  if (checkResult.browserName == null) {
    const { recommendedBrowser } = checkResult
    content.value = {
      en: `Your browser may not support all features. For the best experience, please use the latest version of ${recommendedBrowser}.`,
      zh: `您的浏览器可能无法支持全部功能，建议使用最新版本的 ${recommendedBrowser} 以获得最佳体验。`
    }
  } else {
    const { browserName } = checkResult
    content.value = {
      en: `Your browser version may not support all features. Please update ${browserName} to the latest version for the best experience.`,
      zh: `您的浏览器版本可能无法支持全部功能，建议将 ${browserName} 更新到最新版本以获得最佳体验。`
    }
  }
  visible.value = true
})
</script>
