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
const directories = ['Introduction', 'Button', 'Color', 'Project card', 'Layout']
</script>

<template>
  <main class="flex min-h-screen min-w-360 flex-col bg-grey-300">
    <CommunityNavbar />
    <CenteredWrapper class="flex-1 py-8" size="large">
      <div class="grid grid-cols-[248px_minmax(0,1fr)] gap-5">
        <aside class="sticky top-20 h-[calc(100vh-120px)] rounded-md border border-grey-300 bg-grey-100 p-4">
          <h1 class="m-0 text-xl font-medium text-title">UI Design</h1>
          <p class="mt-2 text-sm leading-5 text-grey-700">Prototype component guide.</p>
          <nav class="mt-6 grid gap-2" aria-label="Design directory">
            <a v-for="item in directories" :key="item" class="rounded-sm px-2 py-1.5 text-sm text-title no-underline hover:bg-grey-200" :href="`#${item.toLowerCase().replaceAll(' ', '-')}`">
              {{ item }}
            </a>
          </nav>
        </aside>

        <div class="grid gap-5">
          <PrototypeCard id="introduction" class="p-5">
            <p class="m-0 text-sm font-medium text-primary-600">Foundation</p>
            <h2 class="mt-2 mb-0 text-2xl font-medium text-title">Prototype UI design</h2>
            <p class="mt-3 max-w-190 text-sm leading-6 text-grey-700">
              Local playground for checking component states, spacing, tokens, and route-level layout without production dependencies.
            </p>
          </PrototypeCard>

          <PrototypeCard id="button" class="p-5">
            <h2 class="m-0 text-xl font-medium text-title">Buttons</h2>
            <div class="mt-4 flex items-center gap-3">
              <PrototypeButton type="primary" :active="buttonMode === 'primary'" @click="buttonMode = 'primary'">Primary</PrototypeButton>
              <PrototypeButton type="secondary" :active="buttonMode === 'secondary'" @click="buttonMode = 'secondary'">Secondary</PrototypeButton>
              <PrototypeButton type="text" :active="buttonMode === 'text'" @click="buttonMode = 'text'">Text</PrototypeButton>
            </div>
            <p class="mt-4 text-sm leading-6 text-grey-700">Buttons preserve the compact production rhythm and local active state for interaction checks.</p>
          </PrototypeCard>

          <PrototypeCard id="color" class="p-5">
            <h2 class="m-0 text-xl font-medium text-title">Color tokens</h2>
            <div class="mt-4 flex gap-3">
              <div v-for="swatch in swatches" :key="swatch" class="flex items-center gap-2 rounded-sm border border-grey-300 bg-grey-100 p-2">
                <span class="size-8 rounded-sm" :class="swatch"></span>
                <code class="text-sm text-grey-700">{{ swatch }}</code>
              </div>
            </div>
          </PrototypeCard>

          <PrototypeCard id="project-card" class="p-5">
            <ProjectsSection title="Project cards" :projects="projects.slice(0, 4)" />
          </PrototypeCard>

          <PrototypeCard id="layout" class="p-5">
            <h2 class="m-0 text-xl font-medium text-title">Layout</h2>
            <div class="mt-4 grid grid-cols-3 gap-3 text-sm text-grey-700">
              <div class="rounded-sm border border-grey-300 bg-grey-200 p-3">Community navbar</div>
              <div class="rounded-sm border border-grey-300 bg-grey-200 p-3">Centered content wrapper</div>
              <div class="rounded-sm border border-grey-300 bg-grey-200 p-3">Community footer</div>
            </div>
          </PrototypeCard>
        </div>
      </div>
    </CenteredWrapper>
    <CommunityFooter />
  </main>
</template>
