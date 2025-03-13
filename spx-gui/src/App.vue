<template>
  <TagRoot>
    <UIConfigProvider :config="config">
      <UIMessageProvider>
        <UIModalProvider>
          <RouterView />
        </UIModalProvider>
      </UIMessageProvider>
    </UIConfigProvider>
    <TaggingAndMask />
  </TagRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIConfigProvider, UIModalProvider, UIMessageProvider, type Config } from '@/components/ui'
import { useI18n } from './utils/i18n'
import TaggingAndMask from './components/test/TaggingAndMask.vue'
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
