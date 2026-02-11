<template>
  <UIConfigProvider :config="config">
    <MobileReminder v-if="showMobileReminder" />
    <UIMessageProvider v-else>
      <UIModalProvider>
        <BrowserVersionReminder />
        <CopilotRoot>
          <TutorialRoot>
            <AgentCopilotProvider>
              <RouterView />
              <SpotlightUI />
              <CopilotUI />
            </AgentCopilotProvider>
          </TutorialRoot>
        </CopilotRoot>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import AgentCopilotProvider from '@/components/agent-copilot/CopilotProvider.vue'
import CopilotRoot from '@/components/copilot/CopilotRoot.vue'
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import TutorialRoot from '@/components/tutorials/TutorialRoot.vue'
import MobileReminder from '@/components/ua/MobileReminder.vue'
import BrowserVersionReminder from '@/components/ua/BrowserVersionReminder.vue'
import { SpotlightUI } from '@/utils/spotlight'
import { useI18n } from '@/utils/i18n'
import { useInstallRouteLoading } from '@/utils/route-loading'
import { isMobile } from '@/utils/ua'

const showMobileReminder = isMobile()

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
    retryText: t({ en: 'Retry', zh: '重试' }),
    backText: t({ en: 'Back', zh: '返回' })
  }
}))

useInstallRouteLoading()
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
