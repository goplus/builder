<script setup lang="ts">
import { getUserPageRoute, type UserTab } from '@/router'

const props = defineProps<{
  username: string
}>()

const tabs: Array<{ key: UserTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'projects', label: 'Projects' },
  { key: 'likes', label: 'Likes' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' }
]
</script>

<template>
  <nav class="w-45 overflow-hidden rounded-md border border-grey-300 bg-grey-100 py-2 shadow-sm" aria-label="User sections">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      class="block px-4 py-3 text-sm text-grey-800 no-underline hover:bg-grey-200"
      active-class="bg-primary-100 text-primary-700"
      exact-active-class="bg-primary-100 text-primary-700"
      :to="getUserPageRoute(props.username, tab.key)"
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
