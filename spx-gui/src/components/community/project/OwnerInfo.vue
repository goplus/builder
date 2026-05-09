<script setup lang="ts">
import { useUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import UserLink from '../user/UserLink.vue'

const props = defineProps<{
  owner: string
}>()

const { data: user } = useUser(() => props.owner)
const avatarUrl = useAvatarUrl(() => user.value?.avatar)
</script>

<!-- TODO: extract to `@/components/ui/`? -->
<template>
  <UserLink
    class="group flex items-center gap-1 text-title underline transition-colors duration-100 hover:text-primary-main active:text-primary-600"
    :user="user?.username ?? null"
  >
    <i
      class="block h-6 w-6 rounded-full border-2 border-grey-100 bg-grey-100 bg-center bg-contain transition-colors duration-100 group-hover:border-primary-400 group-active:border-primary-600"
      :style="user != null ? { backgroundImage: `url(${avatarUrl})` } : null"
    ></i>
    {{ user?.displayName }}
  </UserLink>
</template>
