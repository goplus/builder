<script setup lang="ts">
import UIEditorSpriteItem from '@/components/ui/block-items/UIEditorSpriteItem.vue'

const sprites = [
  {
    id: 'sprite01',
    name: 'Sprite01',
    visible: true,
    selected: true
  },
  {
    id: 'sprite01-hidden',
    name: 'Sprite01 Hidden',
    visible: false,
    selected: false
  },
  {
    id: 'grey-running',
    name: 'Grey Running Sprite',
    visible: true,
    selected: false
  },
  {
    id: 'green-running-hidden',
    name: 'Green Running Hidden Sprite',
    visible: false,
    selected: false
  }
]
</script>

<template>
  <main class="min-h-screen min-w-360 bg-[#f1f5f7] text-title">
    <header class="flex h-12 items-center justify-between border-b border-grey-400 bg-grey-100 px-4">
      <div class="flex w-[473px] items-center gap-3">
        <span class="text-sm font-medium">XBuilder</span>
        <span class="rounded-sm bg-grey-300 px-2 py-1 text-xs text-hint-2">Sprite prototype</span>
      </div>
      <div class="flex w-[474px] justify-center">
        <div class="h-8 w-70 rounded-md bg-grey-300"></div>
      </div>
      <div class="flex w-[473px] items-center justify-end gap-2">
        <button class="rounded-md bg-turquoise-500 px-4 py-1.5 text-xs font-medium text-white" type="button">Run</button>
        <button class="rounded-md bg-turquoise-100 px-4 py-1.5 text-xs font-medium text-turquoise-700" type="button">Publish</button>
      </div>
    </header>

    <section class="grid grid-cols-[minmax(0,896px)_496px] gap-4 p-4">
      <section class="min-h-[826px] rounded-md bg-grey-100 p-0 shadow-control">
        <div class="flex h-10 items-center justify-between px-4">
          <h1 class="m-0 text-sm font-medium">Preview</h1>
        </div>
        <div class="mx-4 flex h-[284px] items-center justify-center rounded-md bg-grey-400">
          <div class="relative h-40 w-40 border border-turquoise-500 bg-grey-300">
            <span class="absolute -top-3 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-grey-100 text-xs shadow-control">↻</span>
            <span class="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-md bg-grey-100 px-3 py-2 text-xs shadow-sm">
              <span>⌖</span>
              <span>↻</span>
              <span>⇱</span>
              <span>▰</span>
            </span>
          </div>
        </div>
      </section>

      <section class="grid grid-rows-[426px_388px] gap-4">
        <section class="rounded-md bg-grey-100 shadow-control">
          <div class="flex h-10 items-center justify-between border-b border-grey-400 px-3">
            <h2 class="m-0 text-sm font-medium">Sprites</h2>
            <button class="grid size-6 place-items-center rounded-sm text-lg leading-none text-hint-2 hover:bg-grey-300" type="button" aria-label="Add sprite">+</button>
          </div>

          <ul class="m-0 flex list-none gap-2 p-3">
            <li v-for="sprite in sprites" :key="sprite.id">
              <UIEditorSpriteItem
                :name="sprite.name"
                :visible="sprite.visible"
                :selectable="{ selected: sprite.selected }"
                :data-sprite-id="sprite.id"
              >
                <template #img="{ style }">
                  <img :style="style" class="object-contain" src="@ui-images/sprite.png" alt="" />
                </template>
              </UIEditorSpriteItem>
            </li>
          </ul>
        </section>

        <section class="rounded-md bg-grey-100 shadow-control">
          <div class="flex h-10 items-center border-b border-grey-400 px-3">
            <h2 class="m-0 text-sm font-medium">Stage</h2>
          </div>
          <div class="flex gap-6 px-3 py-4">
            <div class="flex w-18 flex-col items-center gap-2 text-center text-xs text-hint-2">
              <img class="size-11 rounded-md border border-turquoise-400 object-cover p-1" src="@ui-images/backdrop.png" alt="" />
              <span>Backdrops</span>
            </div>
            <div class="flex w-18 flex-col items-center gap-2 text-center text-xs text-hint-2">
              <span class="grid size-11 place-items-center rounded-md border border-grey-400 text-xl">▣</span>
              <span>Sounds</span>
            </div>
            <div class="flex w-18 flex-col items-center gap-2 text-center text-xs text-hint-2">
              <span class="grid size-11 place-items-center rounded-md border border-grey-400 text-xl">▤</span>
              <span>Widgets</span>
            </div>
          </div>
        </section>
      </section>
    </section>
  </main>
</template>
