<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <UIModalProvider>
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
import CopilotRoot from './components/copilot/CopilotRoot.vue'
import CopilotUI from './components/copilot/CopilotUI.vue'
import TutorialRoot from './components/tutorials/TutorialRoot.vue'
import { SpotlightUI } from '@/utils/spotlight'
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
