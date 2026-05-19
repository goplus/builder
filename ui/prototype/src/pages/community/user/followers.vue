<script setup lang="ts">
import { computed } from 'vue'

import { listFollowers } from '@/apis/user'
import UserContent from '@/components/community/user/UserContent.vue'
import UserList from '@/components/community/user/UserList.vue'

const props = defineProps<{
  nameInput: string
}>()

const users = computed(() => listFollowers(props.nameInput))
</script>

<template>
  <UserContent>
    <template #title>Followers</template>
    <UserList :users="users" />
  </UserContent>
</template>
