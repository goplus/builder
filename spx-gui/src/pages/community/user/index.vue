<script setup lang="ts">
import { useUser } from '@/stores/user'
import { UIError } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/sidebar/UserSidebar.vue'

const props = defineProps<{
  nameInput: string
}>()

const { data: user, error, refetch } = useUser(() => props.nameInput)
</script>

<template>
  <CenteredWrapper class="flex flex-[1_0_auto] flex-col gap-5 pt-6 pb-10" size="large">
    <UIError v-if="error != null" class="flex flex-[1_1_0] rounded-2 bg-grey-100" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <template v-else-if="user != null">
      <UserHeader :user="user" />
      <div class="flex items-start gap-5">
        <UserSidebar class="flex-[0_0_auto]" :username="user.username" />
        <div class="min-w-0 flex-[1_1_0]">
          <router-view />
        </div>
      </div>
    </template>
  </CenteredWrapper>
</template>
