<template>
  <UIConfigProvider :config="config">
    <UIMessageProvider>
      <UIModalProvider>
        <RouterView />
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider } from '@/components/ui'
import { useI18n } from './utils/i18n'

const { t } = useI18n()

const config = computed(() => ({
  confirmDialog: {
    cancelText: t({ en: 'Cancel', zh: '取消' }),
    confirmText: t({ en: 'Confirm', zh: '确认' })
  },
  empty: {
    text: t({ en: 'No result.', zh: '没有结果' })
  }
}))
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
