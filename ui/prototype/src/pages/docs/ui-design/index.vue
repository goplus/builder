<script setup lang="ts">
import { ref } from 'vue'

import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/CommunityFooter.vue'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import PrototypeButton from '@/components/ui/PrototypeButton.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'
import { projects } from '@/data/mock'

const buttonMode = ref<'primary' | 'secondary' | 'text'>('primary')
const swatches = ['bg-primary-500', 'bg-turquoise-500', 'bg-yellow-500', 'bg-red-500', 'bg-grey-700']
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex-1 py-8" size="large">
      <header class="mb-6">
        <h1 class="m-0 text-3xl font-medium text-title">UI Design</h1>
        <p class="mt-3 max-w-180 text-sm leading-6 text-grey-700">
          Local playground for checking component states, spacing, tokens, and route-level layout without production dependencies.
        </p>
      </header>

      <div class="grid gap-5">
        <PrototypeCard class="p-5">
          <h2 class="m-0 text-xl font-medium text-title">Buttons</h2>
          <div class="mt-4 flex items-center gap-3">
            <PrototypeButton type="primary" :active="buttonMode === 'primary'" @click="buttonMode = 'primary'">Primary</PrototypeButton>
            <PrototypeButton type="secondary" :active="buttonMode === 'secondary'" @click="buttonMode = 'secondary'">Secondary</PrototypeButton>
            <PrototypeButton type="text" :active="buttonMode === 'text'" @click="buttonMode = 'text'">Text</PrototypeButton>
          </div>
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <h2 class="m-0 text-xl font-medium text-title">Color tokens</h2>
          <div class="mt-4 flex gap-3">
            <div v-for="swatch in swatches" :key="swatch" class="flex items-center gap-2 rounded-sm border border-grey-300 bg-grey-100 p-2">
              <span class="size-8 rounded-sm" :class="swatch"></span>
              <code class="text-sm text-grey-700">{{ swatch }}</code>
            </div>
          </div>
        </PrototypeCard>

        <PrototypeCard class="p-5">
          <ProjectsSection title="Project cards" :projects="projects.slice(0, 4)" />
        </PrototypeCard>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
