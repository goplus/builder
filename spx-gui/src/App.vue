<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <UIModalProvider>
        <RouterView />
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>

  <CopilotUI v-show="isCopilotActive" class="copilot" :controller="copilotController" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import CopilotUI from '@/components/editor/code-editor/ui/copilot/CopilotUI.vue' // Import from correct path
import { useI18n } from './utils/i18n'
import { useCopilotStore } from '@/utils/utils'
import { CopilotController } from '@/components/editor/code-editor/ui/copilot' // Import the controller

const { t } = useI18n()

// Ensure the injected state is reactive
const isCopilotActive = useCopilotStore()
const copilotController = new CopilotController(null)

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
