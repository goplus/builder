<template>
  <RouterLink :to="to" :title="user?.displayName">
    <slot></slot>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { getUser, type User } from '@/apis/user'
import { getUserPageRoute } from '@/router'

const props = defineProps<{
  user: string | User | null
}>()

const to = computed(() => {
  if (props.user == null) return '' // TODO: some better default value?
  const username = typeof props.user === 'string' ? props.user : props.user.username
  return getUserPageRoute(username)
})

const user = useAsyncComputed(() =>
  typeof props.user === 'string' ? getUser(props.user) : Promise.resolve(props.user)
)
</script>
