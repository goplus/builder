<script setup lang="ts">
import { computed } from 'vue'

import { listFollowing } from '@/apis/user'
import UserContent from '@/components/community/user/UserContent.vue'
import UserList from '@/components/community/user/UserList.vue'

const props = defineProps<{
  nameInput: string
}>()

const users = computed(() => listFollowing(props.nameInput))
</script>

<template>
  <UserContent>
    <template #title>Following</template>
    <UserList :users="users" />
  </UserContent>
</template>
