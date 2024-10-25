<script setup lang="ts">
import { useUser } from '@/stores/user'
import { UIError } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/sidebar/UserSidebar.vue'

const props = defineProps<{
  name: string
}>()

const { data: user, error, refetch } = useUser(() => props.name)
</script>

<template>
  <CenteredWrapper class="user-page" size="large">
    <UIError v-if="error != null" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <template v-else-if="user != null">
      <UserHeader :user="user" />
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
