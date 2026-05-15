<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getProject, getProjectEditorRoute } from '@/apis/project'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'

const props = defineProps<{
  ownerInput: string
  nameInput: string
}>()

const project = computed(() => getProject(props.ownerInput, props.nameInput))
const liked = ref(false)

onMounted(() => {
  document.title = `${project.value.title} - XBuilder`
})
</script>

<template>
  <main>
    <CenteredWrapper class="grid grid-cols-[minmax(0,1fr)_320px] gap-8 pt-8 pb-10">
      <section class="overflow-hidden rounded-lg border border-grey-400 bg-grey-100">
        <div class="aspect-video bg-grey-1000">
          <img class="size-full object-cover" :src="project.thumbnail" :alt="project.title" />
        </div>
        <div class="flex items-center justify-between border-t border-grey-400 p-4">
          <div class="text-sm text-hint-1">{{ project.views }} views · {{ project.updatedAt }}</div>
          <div class="flex gap-2">
            <button class="rounded-md border border-grey-400 bg-grey-100 px-3 py-2 text-sm text-title" type="button" @click="liked = !liked">
              {{ liked ? 'Liked' : 'Like' }}
            </button>
            <RouterLink class="rounded-md bg-primary-main px-3 py-2 text-sm font-medium text-white no-underline" :to="getProjectEditorRoute(project)">
              See inside
            </RouterLink>
          </div>
        </div>
      </section>

      <aside>
        <h1 class="m-0 text-2xl font-medium text-title">{{ project.title }}</h1>
        <RouterLink class="mt-4 flex items-center gap-3 text-text no-underline" :to="`/user/${project.owner.username}`">
          <img class="size-10 rounded-full border border-grey-400 object-cover" :src="project.owner.avatar" alt="" />
          <span>{{ project.owner.displayName }}</span>
        </RouterLink>
        <p class="mt-5 text-sm leading-6 text-text">{{ project.description }}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          <span v-for="tag in project.tags" :key="tag" class="rounded-full bg-grey-300 px-3 py-1 text-xs text-hint-2">{{ tag }}</span>
        </div>
        <dl class="mt-6 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-md border border-grey-400 bg-grey-100 p-3">
            <dt class="text-xs text-hint-1">Likes</dt>
            <dd class="m-0 mt-1 text-lg text-title">{{ project.likes + (liked ? 1 : 0) }}</dd>
          </div>
          <div class="rounded-md border border-grey-400 bg-grey-100 p-3">
            <dt class="text-xs text-hint-1">Remixes</dt>
            <dd class="m-0 mt-1 text-lg text-title">{{ project.remixes }}</dd>
          </div>
          <div class="rounded-md border border-grey-400 bg-grey-100 p-3">
            <dt class="text-xs text-hint-1">Views</dt>
            <dd class="m-0 mt-1 text-lg text-title">{{ project.views }}</dd>
          </div>
        </dl>
      </aside>
    </CenteredWrapper>
  </main>
</template>
