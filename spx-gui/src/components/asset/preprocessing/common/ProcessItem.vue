<template>
  <li class="relative flex h-fit w-22 cursor-pointer flex-col items-center">
    <UIImg
      class="h-16.5 w-22 rounded-1"
      :style="active ? { boxShadow: 'inset 0 0 0 2px var(--ui-color-primary-main)' } : null"
      :src="imgSrc"
    />
    <div
      class="absolute top-5.25 left-8 flex h-6 w-6 items-center justify-center rounded-full bg-green-main text-grey-100 transition-opacity duration-200"
      :class="applied ? 'opacity-100' : 'opacity-0'"
    >
      <UIIcon color="sprite" type="check" />
    </div>
    <p class="w-full px-[1em] py-0.5 text-center text-10/[1.4] text-title">{{ name }}</p>
  </li>
</template>

<script setup lang="ts">
import { UIImg, UIIcon } from '@/components/ui'

defineProps<{
  imgSrc: string
  name: string
  /** If the processing is already applied (to image) */
  applied: boolean
  active: boolean
}>()
</script>
