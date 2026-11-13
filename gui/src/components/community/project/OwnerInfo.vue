<script setup lang="ts">
import { useUser } from '@/stores/user'
import UserLink from '../user/UserLink.vue'

const props = defineProps<{
  owner: string
}>()

const { data: user } = useUser(() => props.owner)
</script>

<!-- TODO: extract to `@/components/ui/`? -->
<template>
  <UserLink
    class="group flex items-center gap-1 text-title underline transition-colors duration-100 hover:text-primary-main active:text-primary-600"
    :user="user?.username ?? null"
  >
    <img
      class="block h-6 w-6 rounded-full object-contain border-2 border-grey-100 bg-grey-100 transition-colors duration-100 group-hover:border-primary-400 group-active:border-primary-600"
      crossorigin="anonymous"
      :src="user?.avatar"
      alt=""
    />
    {{ user?.displayName }}
  </UserLink>
</template>
