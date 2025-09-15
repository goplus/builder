<script setup lang="ts">
import { useUser } from '@/stores/user'
import { UIError, UIIcon } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import UserHeader from '@/components/community/user/UserHeader.vue'
import UserSidebar from '@/components/community/user/sidebar/UserSidebar.vue'
import { useResponsive } from '@/components/ui/responsive'
import { ref } from 'vue'
const props = defineProps<{
  name: string
}>()

const { data: user, error, refetch } = useUser(() => props.name)
const isMobile = useResponsive('mobile')

// 侧边栏状态管理
const isSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}
</script>

<template>
  <CenteredWrapper class="user-page" size="large">
    <UIError v-if="error != null" class="error" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <template v-else-if="user != null">
      <UserHeader :user="user" />
      <div class="main">
        <UserSidebar v-if="!isMobile || isSidebarOpen" class="sidebar" :username="name" @close="closeSidebar" />
        <div class="content">
          <router-view />
        </div>
      </div>
      <!-- 移动端侧边栏展开按钮 -->
      <div v-if="isMobile && !isSidebarOpen" class="mobile-sidebar-toggle" @click="toggleSidebar">
        <UIIcon type="info" />
      </div>
    </template>
  </CenteredWrapper>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive';

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

    @include responsive(mobile) {
      position: fixed;
      bottom: 5%;
      z-index: 999;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
    }
  }

  .content {
    flex: 1 1 0;
    min-width: 0;
  }
}

.mobile-sidebar-toggle {
  position: fixed;
  bottom: 5%;
  left: 16px;
  width: 48px;
  height: 48px;
  background-color: var(--ui-color-primary-main);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;

  &:hover {
    background-color: var(--ui-color-primary-dark);
  }
}
</style>
