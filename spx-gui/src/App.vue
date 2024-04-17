<template>
  <UIConfigProvider>
    <UIModalProvider>
      <NMessageProvider>
        <NDialogProvider>
          <NModalProvider>
            <RouterView />
          </NModalProvider>
        </NDialogProvider>
      </NMessageProvider>
    </UIModalProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { NMessageProvider, NModalProvider, NDialogProvider } from 'naive-ui'
import { UIConfigProvider, UIModalProvider } from '@/components/ui'
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
