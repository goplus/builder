<template>
  <div v-if="!userStore.userInfo" class="sign-in">
    <UIButton type="secondary" :disabled="!isOnline" @click="userStore.signInWithRedirection()">{{
      $t({ en: 'Sign in', zh: '登录' })
    }}</UIButton>
  </div>
  <UIDropdown v-else placement="bottom-end" :offset="{ x: -4, y: 8 }">
    <template #trigger>
      <div class="avatar">
        <img class="avatar-img" :src="userStore.userInfo.avatar" />
      </div>
    </template>
    <UIMenu class="user-menu">
      <UIMenuGroup>
        <UIMenuItem :interactive="false">
          {{ userStore.userInfo.displayName || userStore.userInfo.name }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup>
        <UIMenuItem @click="handleUserPage">
          {{ $t({ en: 'Profile', zh: '个人主页' }) }}
        </UIMenuItem>
        <UIMenuItem @click="handleProjects">
          {{ $t({ en: 'Projects', zh: '项目列表' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup>
        <UIMenuItem @click="userStore.signOut()">{{
          $t({ en: 'Sign out', zh: '登出' })
        }}</UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNetwork } from '@/utils/network'
import { getUserPageRoute } from '@/router'
import { useUserStore } from '@/stores'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'

const userStore = useUserStore()
const { isOnline } = useNetwork()
const router = useRouter()

function handleUserPage() {
  router.push(getUserPageRoute(userStore.userInfo!.name))
}

function handleProjects() {
  router.push(getUserPageRoute(userStore.userInfo!.name, 'projects'))
}
</script>

<style lang="scss" scoped>
.sign-in,
.avatar {
  margin: 0 4px 0 8px;
  height: 100%;
  display: flex;
  align-items: center;
}

.sign-in {
  white-space: nowrap;
}

.avatar {
  width: 72px;
  justify-content: center;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }

  .avatar-img {
    width: 32px;
    height: 32px;
    border-radius: 16px;
  }
}

.user-menu {
  min-width: 120px;
}
</style>
