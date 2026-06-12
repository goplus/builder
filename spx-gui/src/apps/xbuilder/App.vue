<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <MobileReminder v-if="showMobileReminder" />
      <UIModalProvider v-else>
        <BrowserVersionReminder />
        <UpdateNotificationWrapper>
          <CopilotRoot>
            <TutorialRoot>
              <RouterView />
              <SpotlightUI />
              <CopilotUI />
            </TutorialRoot>
          </CopilotRoot>
        </UpdateNotificationWrapper>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import BrowserVersionReminder from '@/components/app/browser-check/BrowserVersionReminder.vue'
import UpdateNotificationWrapper from '@/components/app/update-check/UpdateNotificationWrapper.vue'
import CopilotRoot from '@/components/copilot/CopilotRoot.vue'
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import TutorialRoot from '@/components/tutorials/TutorialRoot.vue'
import { SpotlightUI } from '@/utils/spotlight'
import { useI18n } from '@/utils/i18n'
import { useInstallRouteLoading } from '@/utils/route-loading'
import { isMobile } from '@/utils/ua'
import { getUIConfig } from '@/setup'

const MobileReminder = defineAsyncComponent(() => import('@/components/app/device-check/MobileReminder.vue'))

const showMobileReminder = isMobile()

const i18n = useI18n()
const config = computed<Config>(() => getUIConfig(i18n))

useInstallRouteLoading()
</script>
