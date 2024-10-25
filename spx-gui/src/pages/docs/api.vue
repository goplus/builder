<template>
  <ApiReference :configuration="configuration" />
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ApiReference, type ReferenceConfiguration } from '@scalar/api-reference'
import '@scalar/api-reference/style.css'
import apiDocument from '@docs/openapi.yaml?raw'
import { apiBaseUrl } from '@/utils/env'

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
