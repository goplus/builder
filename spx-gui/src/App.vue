<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <UIModalProvider>
        <CopilotProvider>
          <RouterView />
        </CopilotProvider>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>

  <!--  MCP Debugger  -->  
  <UIMcpDebugger :is-visible="isMcpDebuggerVisible" @close="closeMcpDebugger" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, UIMcpDebugger, type Config } from '@/components/ui'
import CopilotProvider from '@/components/copilot/CopilotProvider.vue'
import { useI18n } from './utils/i18n'
import { useMcpDebuggerStore } from '@/utils/utils'

const { t } = useI18n()

// Ensure the injected state is reactive
const isMcpDebuggerVisible = useMcpDebuggerStore()

// Close the debugger panel
function closeMcpDebugger() {
  isMcpDebuggerVisible.value = false // Update the state
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