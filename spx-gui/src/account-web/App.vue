<template>
  <UIConfigProvider :config="config">
    <RouterView />
  </UIConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { getUIConfig } from '@/setup'
import { useI18n } from '@/utils/i18n'
import { type Config, UIConfigProvider } from '@/components/ui'

const i18n = useI18n()
const config = computed<Config>(() => getUIConfig(i18n))
</script>
