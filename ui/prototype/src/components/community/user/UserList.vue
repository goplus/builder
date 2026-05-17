<script setup lang="ts">
import type { UserProfile } from '@/data/mock'
import { getUserPageRoute } from '@/router'

defineProps<{
  users: UserProfile[]
}>()
</script>

<template>
  <ul class="m-0 grid list-none grid-cols-2 gap-4 p-0">
    <li v-for="user in users" :key="user.username" class="rounded-md border border-grey-300 bg-grey-100 p-4">
      <RouterLink class="flex items-center gap-3 text-text no-underline" :to="getUserPageRoute(user.username)">
        <img class="size-12 rounded-full object-cover" :src="user.avatar" alt="" />
        <span class="min-w-0">
          <span class="block truncate text-base text-title">{{ user.displayName }}</span>
          <span class="block truncate text-sm text-hint-1">@{{ user.username }}</span>
        </span>
      </RouterLink>
      <p class="mt-3 line-clamp-2 text-sm leading-5 text-grey-700">{{ user.bio }}</p>
    </li>
  </ul>
</template>
