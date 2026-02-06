<template>
  <UIConfigProvider :config="config">
    <DesktopRequiredGuide v-if="isMobile" />
    <UIMessageProvider v-else>
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
import { computed, ref, onMounted } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import AgentCopilotProvider from '@/components/agent-copilot/CopilotProvider.vue'
import CopilotRoot from '@/components/copilot/CopilotRoot.vue'
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import TutorialRoot from '@/components/tutorials/TutorialRoot.vue'
import DesktopRequiredGuide from '@/components/mobile/DesktopRequiredGuide.vue'
import { SpotlightUI } from '@/utils/spotlight'
import { useI18n } from '@/utils/i18n'
import { useInstallRouteLoading } from '@/utils/route-loading'

const isMobile = ref(false)

onMounted(() => {
  // TODO: Consider move to utils/ua.ts, and make more robust detection
  // Detect mobile devices
  const userAgent = navigator.userAgent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches

  isMobile.value = mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen)
})

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
