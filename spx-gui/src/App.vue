<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <UIModalProvider>
        <RouterView />
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>

  <CopilotChat v-show="isCopilotActive" :controller="copilotController" @close="closeCopilot" />
  <UIMcpDebugger :is-visible="isMcpDebuggerVisible" @close="closeMcpDebugger" />
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, UIMcpDebugger,  type Config } from '@/components/ui'
import { useI18n } from './utils/i18n'
import { useCopilotStore, useMcpDebuggerStore } from '@/utils/utils'
import { CopilotChat, CopilotController } from '@/components/copilot'
// import UseMcpTool from '@/components/editor/code-editor/ui/markdown/UseMcpTool.vue'

import { Copilot } from '@/components/copilot/copilot'

const i18n = useI18n()
const { t } = i18n
// Ensure the injected state is reactive
const isCopilotActive = useCopilotStore()
const isMcpDebuggerVisible = useMcpDebuggerStore()

let copilot = new Copilot(i18n)
let copilotController = new CopilotController(copilot)

copilotController.init()

provide('copilotController', copilotController)

// Close the debugger panel
function closeMcpDebugger() {
  isMcpDebuggerVisible.value = false // Update the state
}

function closeCopilot() {
  console.log("closeCopilot")
  isCopilotActive.value = false // Update the state
}

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
