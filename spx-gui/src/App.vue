<template>
  <UIConfigProvider>
    <UIMessageProvider>
      <UIModalProvider>
        <NDialogProvider>
          <NModalProvider>
            <RouterView />
          </NModalProvider>
        </NDialogProvider>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { NModalProvider, NDialogProvider } from 'naive-ui'
import { UIConfigProvider, UIModalProvider, UIMessageProvider } from '@/components/ui'
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
