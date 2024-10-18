<script setup lang="ts">
import { useQuery } from '@/utils/exception'
import { getUser, type User } from '@/apis/user'
import { UIError } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/sidebar/UserSidebar.vue'

const props = defineProps<{
  name: string
}>()

const { data: user, error } = useQuery(() => getUser(props.name), {
  en: 'Failed to load user information',
  zh: '加载用户信息失败'
})

function handleUserUpdated(updated: User) {
  user.value = updated
}
</script>

<template>
  <CenteredWrapper class="user-page" size="large">
    <UIError v-if="error != null" :error="error" />
    <template v-else-if="user != null">
      <UserHeader :user="user" @updated="handleUserUpdated" />
      <div class="main">
        <UserSidebar class="sidebar" :username="name" />
        <div class="content">
          <router-view />
        </div>
      </div>
    </template>
  </CenteredWrapper>
</template>

<style lang="scss" scoped>
.user-page {
  padding: 24px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.main {
  display: flex;
  align-items: flex-start;
  gap: 20px;

  .sidebar {
    flex: 0 0 auto;
  }
  .content {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
