<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getProject } from '@/apis/project'
import UIEditorSpriteItem from '@/components/editor/UIEditorSpriteItem.vue'
import { editorProject, type Sprite } from '@/data/mock'

const props = defineProps<{
  ownerNameInput: string
  projectNameInput: string
}>()

const project = computed(() => getProject(props.ownerNameInput, props.projectNameInput))
const sprites = ref<Sprite[]>(editorProject.sprites.map((sprite) => ({ ...sprite })))
const selectedId = ref(editorProject.sprites[0]?.id ?? '')

function selectSprite(id: string) {
  selectedId.value = id
}

function toggleSelectedVisibility() {
  sprites.value = sprites.value.map((sprite) =>
    sprite.id === selectedId.value ? { ...sprite, visible: !sprite.visible } : sprite
  )
}

onMounted(() => {
  document.title = `${project.value.title} - Editor - XBuilder`
})
</script>

<template>
  <main class="flex h-screen min-h-150 min-w-360 flex-col bg-grey-200 text-text">
    <header class="flex h-12 items-center justify-between border-b border-grey-400 bg-grey-100 px-4">
      <div class="flex items-center gap-3">
        <RouterLink class="text-sm text-primary-600 no-underline" :to="`/project/${project.owner.username}/${project.name}`">
          Back
        </RouterLink>
        <div class="h-5 w-px bg-dividing-line-1"></div>
        <h1 class="m-0 text-base font-medium text-title">{{ project.title }}</h1>
      </div>
      <div class="flex gap-2">
        <button class="rounded-md border border-grey-400 bg-grey-100 px-3 py-1.5 text-sm text-title" type="button" @click="toggleSelectedVisibility">
          Toggle visibility
        </button>
        <button class="rounded-md bg-primary-main px-3 py-1.5 text-sm font-medium text-white" type="button">
          Run
        </button>
      </div>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside class="flex min-h-0 flex-col border-r border-grey-400 bg-grey-100">
        <div class="border-b border-grey-400 px-4 py-3">
          <h2 class="m-0 text-sm font-medium text-title">Sprites</h2>
          <p class="mt-1 text-xs text-hint-1">Editor sprite prototype surface</p>
        </div>

        <div class="grid grid-cols-2 gap-3 overflow-auto p-4">
          <UIEditorSpriteItem
            v-for="sprite in sprites"
            :key="sprite.id"
            :name="sprite.name"
            :color="sprite.color"
            :selected="selectedId === sprite.id"
            :visible="sprite.visible"
            @click="selectSprite(sprite.id)"
          />
        </div>
      </aside>

      <section class="grid min-h-0 place-items-center overflow-hidden bg-grey-300 p-8">
        <div class="relative aspect-video w-full max-w-210 overflow-hidden rounded-lg border border-grey-500 bg-white shadow-sm">
          <img class="absolute inset-0 size-full object-cover opacity-90" :src="project.thumbnail" alt="" />
          <div class="absolute right-6 bottom-6 rounded-md bg-grey-100 px-4 py-2 text-sm text-title shadow-sm">
            Local stage preview
          </div>
        </div>
      </section>

      <aside class="border-l border-grey-400 bg-grey-100 p-4">
        <h2 class="m-0 text-sm font-medium text-title">Inspector</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div>
            <dt class="text-hint-1">Selected sprite</dt>
            <dd class="m-0 mt-1 text-title">{{ sprites.find((sprite) => sprite.id === selectedId)?.name }}</dd>
          </div>
          <div>
            <dt class="text-hint-1">Visibility</dt>
            <dd class="m-0 mt-1 text-title">
              {{ sprites.find((sprite) => sprite.id === selectedId)?.visible ? 'Visible' : 'Hidden' }}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  </main>
</template>
