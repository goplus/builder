<template>
  <UIConfigProvider>
    <NMessageProvider>
      <UIModalProvider>
        <NDialogProvider>
          <NModalProvider>
            <RouterView />
          </NModalProvider>
        </NDialogProvider>
      </UIModalProvider>
    </NMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { NMessageProvider, NModalProvider, NDialogProvider } from 'naive-ui'
import { UIConfigProvider, UIModalProvider } from '@/components/ui'
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
