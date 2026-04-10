<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUser } from '@/stores/user'
import { UIError } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/sidebar/UserSidebar.vue'

const props = defineProps<{
  nameInput: string
}>()

const router = useRouter()
const { data: user, error, refetch } = useUser(() => props.nameInput)

watch(user, (currentUser) => {
  if (currentUser == null || currentUser.username === props.nameInput) return
  const route = router.currentRoute.value
  router.replace({
    params: {
      ...route.params,
      nameInput: currentUser.username
    },
    query: route.query,
    hash: route.hash
  })
})
</script>

<template>
  <CenteredWrapper class="user-page" size="large">
    <UIError v-if="error != null" class="error" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <template v-else-if="user != null">
      <UserHeader :user="user" />
      <div class="main">
        <UserSidebar class="sidebar" :username="user.username" />
        <div class="content">
          <router-view />
        </div>
      </div>
    </template>
  </CenteredWrapper>
</template>

<style lang="scss" scoped>
.user-page {
  flex: 1 0 auto;
  padding: 24px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error {
  flex: 1 1 0;
  display: flex;

  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
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
