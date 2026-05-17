<script setup lang="ts">
import { onMounted } from 'vue'

import { listDocsEndpoints } from '@/apis/docs'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'

const endpoints = listDocsEndpoints()

onMounted(() => {
  document.title = 'API Reference - XBuilder'
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex-1 py-8" size="large">
      <header class="mb-6">
        <h1 class="m-0 text-3xl font-medium text-title">API Reference</h1>
        <p class="mt-3 max-w-180 text-sm leading-6 text-grey-700">
          Static prototype documentation for preserving the production docs route without loading remote OpenAPI tooling.
        </p>
      </header>
      <div class="grid gap-4">
        <PrototypeCard v-for="endpoint in endpoints" :key="endpoint.path" class="p-5">
          <div class="flex items-center gap-3">
            <span
              class="rounded-sm px-2 py-1 font-mono text-xs font-medium"
              :class="endpoint.method === 'GET' ? 'bg-turquoise-100 text-turquoise-700' : 'bg-primary-100 text-primary-700'"
            >
              {{ endpoint.method }}
            </span>
            <code class="text-sm text-title">{{ endpoint.path }}</code>
          </div>
          <h2 class="mt-4 text-xl font-medium text-title">{{ endpoint.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-grey-700">{{ endpoint.description }}</p>
          <pre class="mt-4 overflow-auto rounded-sm bg-grey-1000 p-4 text-sm text-grey-100">{{ endpoint.response }}</pre>
        </PrototypeCard>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
