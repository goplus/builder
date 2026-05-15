<script setup lang="ts">
import UIBlockItem from '@/components/editor/UIBlockItem.vue'

defineProps<{
  name: string
  color: string
  selected?: boolean
  visible?: boolean
}>()
</script>

<template>
  <UIBlockItem :active="selected">
    <div class="mt-1.5 mb-[5px] grid size-[60px] place-items-center rounded-md bg-grey-300">
      <div class="size-10 rounded-full border-4 border-white shadow-sm" :style="{ backgroundColor: color }"></div>
    </div>

    <div class="flex h-5.5 w-[76px] items-center gap-0.5 px-1.5 text-center text-2xs text-title">
      <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="name">
        {{ name }}
      </span>
      <svg
        v-if="visible === false"
        class="size-3.5 flex-none text-grey-700"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l14 14" />
        <path d="M8.6 8.6a2 2 0 0 0 2.8 2.8" />
        <path d="M6.1 6.6C4.5 7.5 3.2 8.7 2.1 10c2 2.6 4.6 4 7.9 4 1.1 0 2.1-.2 3-.5" />
        <path d="M10.8 6.1c3 .3 5.4 1.6 7.1 3.9-.6.8-1.3 1.5-2.1 2.1" />
      </svg>
    </div>
  </UIBlockItem>
</template>
