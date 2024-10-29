<script setup lang="ts">
import { reactive } from 'vue'
import { ApiReference, type ReferenceConfiguration } from '@scalar/api-reference'
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

const configuration = reactive<ReferenceConfiguration>({
  spec: {
    content: apiDocument
  },
  pathRouting: {
    basePath: '/docs/api'
  },
  baseServerURL: apiBaseUrl
})
</script>

<template>
  <ApiReference :configuration="configuration" />
</template>
