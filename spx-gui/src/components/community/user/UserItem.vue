<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/apis/user'
import { getUserPageRoute } from '@/router'
import RouterUILink from '@/components/common/RouterUILink.vue'
import TextView from '../TextView.vue'
import UserAvatar from './UserAvatar.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'

const props = defineProps<{
  user: User
}>()

const userRoute = computed(() => getUserPageRoute(props.user.username))
</script>

<template>
  <li class="relative flex flex-col py-3 pl-14">
    <UserAvatar class="absolute top-3 left-0" :user="user.username" />
    <!-- TODO: should no-underline be one type of `UILink` / `RouterUILink`? -->
    <RouterUILink
      v-radar="{ name: 'User link', desc: 'Click to view user profile' }"
      class="w-fit text-15/6 text-title no-underline"
      type="boring"
      :to="userRoute"
    >
      {{ user.displayName }}
    </RouterUILink>
    <UserJoinedAt class="w-fit" :time="user.createdAt" />
    <TextView v-if="!!user.description" class="mt-1.5 max-h-15 w-fit text-13/5 text-text" :text="user.description" />
    <FollowButton class="absolute top-3 right-0" :name="user.username" />
  </li>
</template>
