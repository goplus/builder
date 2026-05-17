<script setup lang="ts">
import { onMounted } from 'vue'

import { listDocsEndpoints } from '@/apis/docs'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'

const endpoints = listDocsEndpoints()
const groups = [
  { title: 'Projects', paths: [{ label: '/api/projects', id: 'api-projects' }] },
  { title: 'Users', paths: [{ label: '/api/users/{username}', id: 'api-users-username' }] },
  { title: 'Copilot', paths: [{ label: '/api/copilot/messages', id: 'api-copilot-messages' }] }
]

function endpointId(path: string) {
  return path.replaceAll('/', '-').replaceAll('{', '').replaceAll('}', '').replace(/^-/, '')
}

onMounted(() => {
  document.title = 'API Reference - XBuilder'
})
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex-1 py-8" size="large">
      <div class="grid grid-cols-[248px_minmax(0,1fr)] gap-5">
        <aside class="sticky top-20 h-[calc(100vh-120px)] rounded-md border border-grey-300 bg-grey-100 p-4">
          <h1 class="m-0 text-xl font-medium text-title">API Reference</h1>
          <p class="mt-2 text-sm leading-5 text-grey-700">Offline reference for the prototype routes.</p>
          <nav class="mt-6 grid gap-5" aria-label="API groups">
            <section v-for="group in groups" :key="group.title">
              <h2 class="m-0 text-xs font-medium tracking-wide text-grey-700 uppercase">{{ group.title }}</h2>
              <a v-for="path in group.paths" :key="path.id" class="mt-2 block truncate text-sm text-title no-underline hover:text-primary-600" :href="`#${path.id}`">
                {{ path.label }}
              </a>
            </section>
          </nav>
        </aside>

        <section class="grid gap-4">
          <header class="rounded-md border border-grey-300 bg-grey-100 p-6">
            <p class="m-0 text-sm font-medium text-primary-600">XBuilder API</p>
            <h2 class="mt-2 mb-0 text-3xl font-medium text-title">API Reference</h2>
            <p class="mt-3 max-w-180 text-sm leading-6 text-grey-700">
              Static prototype documentation that preserves the production docs route without loading remote OpenAPI tooling.
            </p>
          </header>

          <PrototypeCard v-for="endpoint in endpoints" :id="endpointId(endpoint.path)" :key="endpoint.path" class="p-5">
            <div class="flex items-center gap-3">
              <span
                class="rounded-sm px-2 py-1 font-mono text-xs font-medium"
                :class="endpoint.method === 'GET' ? 'bg-turquoise-100 text-turquoise-700' : 'bg-primary-100 text-primary-700'"
              >
                {{ endpoint.method }}
              </span>
              <code class="text-sm text-title">{{ endpoint.path }}</code>
            </div>
            <h3 class="mt-4 mb-0 text-xl font-medium text-title">{{ endpoint.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-grey-700">{{ endpoint.description }}</p>
            <div class="mt-4 grid grid-cols-[minmax(0,1fr)_220px] gap-4">
              <pre class="m-0 overflow-auto rounded-sm bg-grey-1000 p-4 text-sm text-grey-100">{{ endpoint.response }}</pre>
              <div class="rounded-sm border border-grey-300 bg-grey-200 p-4 text-sm leading-6 text-grey-700">
                <p class="m-0 font-medium text-title">Prototype notes</p>
                <p class="mt-2">Data is served from local mock modules. No request leaves the app.</p>
              </div>
            </div>
          </PrototypeCard>
        </section>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
