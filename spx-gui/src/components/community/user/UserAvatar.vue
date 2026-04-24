<template>
  <UserLink
    class="block overflow-hidden rounded-full border-grey-100 bg-grey-100 bg-center bg-contain transition-[border-color] duration-100 hover:border-primary-400 active:border-primary-600"
    :class="size === 'small' ? 'h-7.5 w-7.5 border-2' : 'h-12 w-12 border-3'"
    :style="avatarUrl != null ? { backgroundImage: `url(${avatarUrl})` } : null"
    :user="userInfo?.username ?? null"
  ></UserLink>
</template>

<script setup lang="ts">
import { useUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import UserLink from './UserLink.vue'

export type Size = 'small' | 'medium'

const props = withDefaults(
  defineProps<{
    user: string
    size?: Size
  }>(),
  {
    size: 'medium'
  }
)

const { data: userInfo } = useUser(() => props.user)
const avatarUrl = useAvatarUrl(() => userInfo.value?.avatar)
</script>
