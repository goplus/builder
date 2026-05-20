<script setup lang="ts">
import type { UserProfile } from '@/data/mock'

defineProps<{
  user: UserProfile
}>()
</script>

<template>
  <section class="relative overflow-hidden rounded-md border border-grey-300 bg-grey-100 shadow-sm">
    <div class="h-[21.74vh] max-h-50 w-full bg-grey-300">
      <img class="size-full object-cover" :src="user.cover" alt="" />
    </div>
    <div class="absolute bottom-5 left-5 size-38">
      <img class="size-full rounded-full border-2 border-grey-100 bg-grey-100 object-cover" :src="user.avatar" alt="" />
    </div>
    <div class="flex items-end gap-25 px-5 pt-5 pb-5 pl-48">
      <div class="min-w-0 flex-1">
        <h1 class="m-0 truncate text-2xl font-medium text-title">{{ user.displayName }}</h1>
        <p class="mt-1 text-sm text-hint-1">@{{ user.username }} · {{ user.joinedAt }}</p>
        <p class="mt-3 max-w-180 text-sm leading-6 text-text">{{ user.bio }}</p>
      </div>
    </div>
  </section>
</template>
