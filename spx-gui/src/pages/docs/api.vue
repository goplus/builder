<script setup lang="ts">
import { reactive } from 'vue'
import { ApiReference } from '@scalar/api-reference'
import type { AnyApiReferenceConfiguration } from '@scalar/types/api-reference'
import '@scalar/api-reference/style.css'
import apiDocument from '@docs/openapi.yaml?raw'
import { apiBaseUrl } from '@/utils/env'
import { usePageTitle } from '@/utils/utils'

usePageTitle([
  {
    en: `API Reference`,
    zh: `API 参考`
  },
  {
    en: 'Documentation',
    zh: '文档'
  }
])

const configuration = reactive<AnyApiReferenceConfiguration>({
  content: apiDocument,
  pathRouting: {
    basePath: '/docs/api'
  },
  servers: [
    {
      url: apiBaseUrl
    }
  ],
  hideClientButton: true
})
</script>

<template>
  <ApiReference :configuration="configuration" />
</template>
