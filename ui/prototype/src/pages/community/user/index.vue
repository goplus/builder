<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { getUserProfile } from '@/apis/user'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/UserSidebar.vue'

const props = defineProps<{
  nameInput: string
}>()

const user = computed(() => getUserProfile(props.nameInput))

onMounted(() => {
  document.title = `${user.value.displayName} - XBuilder`
})
</script>

<template>
  <CenteredWrapper class="flex-[1_0_auto] flex flex-col gap-5 pt-6 pb-10" size="large">
    <UserHeader :user="user" />
    <div class="flex items-start gap-5">
      <UserSidebar class="flex-none" :username="user.username" />
      <div class="min-w-0 flex-[1_1_0]">
        <RouterView />
      </div>
    </div>
  </CenteredWrapper>
</template>
