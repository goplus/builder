<script setup lang="ts">
import { onMounted } from 'vue'

import { getCommunityHome } from '@/apis/community'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'

const home = getCommunityHome()

onMounted(() => {
  document.title = 'XBuilder'
})
</script>

<template>
  <main>
    <CenteredWrapper class="pt-5 pb-10">
      <section class="my-3 mb-8 overflow-hidden rounded-lg border border-grey-400 bg-grey-100">
        <div class="grid min-h-64 grid-cols-[1fr_360px] items-center gap-8 bg-turquoise-100 px-10 py-8">
          <div>
            <h1 class="m-0 text-[36px] leading-tight font-semibold text-turquoise-700">Build, play, and remix games</h1>
            <p class="mt-3 max-w-150 text-lg leading-7 text-turquoise-700">
              Explore local prototype data that mirrors the XBuilder community without calling the server.
            </p>
            <div class="mt-6 flex gap-3">
              <RouterLink class="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-white no-underline shadow-brand" to="/explore">
                Explore projects
              </RouterLink>
              <RouterLink class="rounded-md border border-grey-500 bg-grey-100 px-4 py-2 text-sm text-title no-underline" to="/tutorials">
                Start tutorial
              </RouterLink>
            </div>
          </div>
          <img class="h-56 w-full object-contain" src="@ui-images/ai-boy.png" alt="" />
        </div>
      </section>

      <ProjectsSection title="Your projects" link-to="/user/code-kiko/projects" :projects="home.mine" />
      <ProjectsSection title="The community is liking" link-to="/explore?o=popular" :projects="home.liked" />
      <ProjectsSection title="The community is remixing" link-to="/explore?o=remixes" :projects="home.remixing" />
      <ProjectsSection title="Users you follow are creating" link-to="/explore?o=latest" :projects="home.following" />
    </CenteredWrapper>
  </main>
</template>
