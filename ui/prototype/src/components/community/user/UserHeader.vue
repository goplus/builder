<script setup lang="ts">
import type { UserProfile } from '@/data/mock'

defineProps<{
  user: UserProfile
}>()
</script>

<template>
  <section class="overflow-hidden rounded-md border border-grey-300 bg-grey-100 shadow-sm">
    <div class="h-36 bg-grey-300">
      <img class="size-full object-cover" :src="user.cover" alt="" />
    </div>
    <div class="flex items-end gap-5 px-6 pb-6">
      <img class="-mt-10 size-24 rounded-full border-4 border-grey-100 object-cover shadow-sm" :src="user.avatar" alt="" />
      <div class="min-w-0 flex-1 pb-1">
        <h1 class="m-0 truncate text-2xl font-medium text-title">{{ user.displayName }}</h1>
        <p class="mt-1 text-sm text-hint-1">@{{ user.username }} · {{ user.joinedAt }}</p>
        <p class="mt-3 max-w-180 text-sm leading-6 text-text">{{ user.bio }}</p>
      </div>
    </div>
  </section>
</template>
