<template>
  <UIConfigProvider :config="config">
    <CopilotProvider>
      <UIMessageProvider>
        <UIModalProvider>
          <RouterView />
        </UIModalProvider>
      </UIMessageProvider>
    </CopilotProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import CopilotProvider from '@/components/copilot/CopilotProvider.vue'
import { useI18n } from './utils/i18n'

const { t } = useI18n()

const config = computed<Config>(() => ({
  confirmDialog: {
    cancelText: t({ en: 'Cancel', zh: '取消' }),
    confirmText: t({ en: 'Confirm', zh: '确认' })
  },
  empty: {
    text: t({ en: 'No data', zh: '没有结果' })
  },
  error: {
    retryText: t({ en: 'Retry', zh: '重试' })
  }
}))
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
