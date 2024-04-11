<template>
  <UIConfigProvider>
    <NMessageProvider>
      <NDialogProvider>
        <NModalProvider>
          <RouterView />
        </NModalProvider>
      </NDialogProvider>
    </NMessageProvider>
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { NMessageProvider, NModalProvider, NDialogProvider } from 'naive-ui'
import { UIConfigProvider } from '@/components/ui'
</script>

<style lang="scss">
@import '@/components/ui/global.scss';
</style>
