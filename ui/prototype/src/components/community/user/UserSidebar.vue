<script setup lang="ts">
import { getUserPageRoute, type UserTab } from '@/router'

const props = defineProps<{
  username: string
}>()

const tabs: Array<{ key: UserTab; label: string; icon: 'overview' | 'projects' | 'likes' | 'following' | 'followers' }> = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'projects', label: 'Projects', icon: 'projects' },
  { key: 'likes', label: 'Likes', icon: 'likes' },
  { key: 'following', label: 'Following', icon: 'following' },
  { key: 'followers', label: 'Followers', icon: 'followers' }
]
</script>

<template>
  <nav class="flex w-53 flex-col gap-1 rounded-md border border-grey-300 bg-grey-100 p-3 shadow-sm desktop-large:w-54" aria-label="User sections">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      class="group relative flex items-center rounded-md p-3 text-text no-underline transition-all duration-100 hover:bg-grey-200 [&.active]:bg-primary-100 [&.active]:text-primary-main"
      exact-active-class="active"
      :to="getUserPageRoute(props.username, tab.key)"
    >
      <i class="absolute top-3.5 left-3 size-4.25 rounded-full bg-grey-500 transition-all duration-100 group-[.active]:bg-primary-300"></i>
      <span class="relative flex flex-[1_1_0] items-center gap-2 pl-6.5 text-sm">
        <svg v-if="tab.icon === 'overview'" aria-hidden="true" viewBox="0 0 20 20" class="size-5 flex-none fill-current text-grey-800 group-[.active]:text-primary-main">
          <path d="M1.5 3.8A.8.8 0 0 1 2.3 3h4.52A3.98 3.98 0 0 1 10 4.6 3.98 3.98 0 0 1 13.2 3h4.5a.8.8 0 0 1 .8.8v11.15a.8.8 0 0 1-.8.8h-4.79a3.2 3.2 0 0 0-2.35.7l-.66.66a.8.8 0 0 1-1.13 0l-.66-.66a3.2 3.2 0 0 0-2.35-.7H2.3a.8.8 0 0 1-.8-.8V3.8Zm7.7 10.96.01-7.78a2.39 2.39 0 0 0-2.4-2.39H3.1v9.57h3.99c.75 0 1.48.21 2.12.6Zm1.6-7.78-.01 7.78a3.98 3.98 0 0 1 2.12-.6h4V4.59h-3.72a2.39 2.39 0 0 0-2.39 2.39Z" />
        </svg>
        <svg v-else-if="tab.icon === 'projects'" aria-hidden="true" viewBox="0 0 20 20" class="size-5 flex-none fill-none stroke-current text-grey-800 group-[.active]:text-primary-main">
          <path d="M7.12 2.93H4.01A1.71 1.71 0 0 0 2.3 4.64v9.93c0 .94.77 1.71 1.71 1.71h11.98c.94 0 1.71-.77 1.71-1.71V8.4c0-.95-.77-1.71-1.71-1.71H12a.78.78 0 0 1-.51-.2L7.63 3.12a.78.78 0 0 0-.51-.19Z" stroke-width="1.45" />
          <path d="M8.86 4.18h7.13c.94 0 1.71.77 1.71 1.72v3.29" stroke-width="1.45" />
        </svg>
        <svg v-else-if="tab.icon === 'likes'" aria-hidden="true" viewBox="0 0 20 20" class="size-5 flex-none fill-current text-grey-800 group-[.active]:text-primary-main">
          <path d="M16.03 4.83a3.99 3.99 0 0 0-5.5-.21.8.8 0 0 1-1.05 0 3.99 3.99 0 0 0-5.5.21 3.73 3.73 0 0 0-.21 5.27l.06.07L10 16.17l6.18-6 .06-.07a3.73 3.73 0 0 0-.21-5.27Zm1.51 6.21a5.35 5.35 0 0 0-.4-7.36A5.54 5.54 0 0 0 10 3.02a5.54 5.54 0 0 0-7.14.66 5.35 5.35 0 0 0-.4 7.36c.04.06.08.12.14.17l6.84 6.64c.31.3.8.3 1.12 0l6.84-6.64c.06-.05.1-.11.14-.17Z" />
        </svg>
        <svg v-else-if="tab.icon === 'following'" aria-hidden="true" viewBox="0 0 20 20" class="size-5 flex-none fill-current text-grey-800 group-[.active]:text-primary-main">
          <path d="M8.34 8.96a3.54 3.54 0 1 1 0-7.09 3.54 3.54 0 0 1 0 7.09Zm0-5.83a2.29 2.29 0 1 0 0 4.58 2.29 2.29 0 0 0 0-4.58ZM9.17 18.13H5c-2.02 0-3.13-1.1-3.13-3.11 0-2.22 1.26-4.81 4.8-4.81H10c.71 0 1.34.1 1.89.3a.63.63 0 0 1-.44 1.18 4.1 4.1 0 0 0-1.45-.23H6.67c-3.29 0-3.54 2.72-3.54 3.56 0 1.3.56 1.86 1.87 1.86h4.17a.63.63 0 0 1 0 1.25Zm7.63.77c-.16 0-.32-.04-.47-.12L15 18.1l-1.33.68a1.02 1.02 0 0 1-1.48-1.08l.26-1.42-1.1-1.05a1 1 0 0 1 .55-1.69l1.53-.22.66-1.3a1.02 1.02 0 0 1 1.82 0l.66 1.3 1.53.22a1 1 0 0 1 .55 1.7l-1.1 1.04.25 1.43a1.02 1.02 0 0 1-1 1.19Z" />
        </svg>
        <svg v-else aria-hidden="true" viewBox="0 0 20 20" class="size-5 flex-none fill-current text-grey-800 group-[.active]:text-primary-main">
          <path d="M7.51 8.96a3.54 3.54 0 1 1 0-7.09 3.54 3.54 0 0 1 0 7.09Zm0-5.83a2.29 2.29 0 1 0 0 4.58 2.29 2.29 0 0 0 0-4.58Zm3.32 15H4.17c-2.02 0-3.13-1.1-3.13-3.11 0-2.22 1.26-4.81 4.79-4.81h3.34c3.54 0 4.79 2.59 4.79 4.81 0 2-1.11 3.1-3.13 3.1Zm-5-6.67c-3.28 0-3.54 2.72-3.54 3.56 0 1.3.56 1.86 1.88 1.86h6.66c1.32 0 1.88-.56 1.88-1.86 0-.84-.26-3.56-3.54-3.56H5.83Zm7.97-2.13c-.76 0-1.47-.29-2-.81a.63.63 0 0 1 .87-.9c.3.3.7.45 1.13.45a1.62 1.62 0 0 0 1.64-1.64c0-.9-.74-1.64-1.64-1.64-.26 0-.49.05-.69.16a.63.63 0 0 1-.57-1.11c.38-.2.8-.3 1.26-.3a2.9 2.9 0 0 1 0 5.79Zm2.58 7.13h-.56a.63.63 0 0 1 0-1.25h.56c.96 0 1.33-.37 1.33-1.31 0-.62-.2-2.63-2.62-2.63h-1.26a.63.63 0 0 1 0-1.25h1.26c2.86 0 3.87 2.09 3.87 3.88 0 1.63-.94 2.56-2.58 2.56Z" />
        </svg>
        <span>{{ tab.label }}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" class="size-3 flex-none rotate-90 fill-current text-grey-800">
        <path d="M10 13.2 4.8 8l1.13-1.13L10 10.93l4.07-4.06L15.2 8 10 13.2Z" />
      </svg>
    </RouterLink>
  </nav>
</template>
