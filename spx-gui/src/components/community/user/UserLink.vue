<template>
  <RouterLink
    v-radar="{ name: 'User link', desc: 'Click to view user profile' }"
    :to="to ?? ''"
    :title="userInfo?.displayName"
  >
    <slot></slot>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getUserPageRoute } from '@/router'
import { useUser } from '@/stores/user'

const props = defineProps<{
  user: string | null
}>()

const to = computed(() => (props.user == null ? null : getUserPageRoute(props.user)))
const { data: userInfo } = useUser(() => props.user)
</script>
