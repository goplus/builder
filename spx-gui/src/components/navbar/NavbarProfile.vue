<template>
  <div v-if="!userStore.userInfo" class="sign-in">
    <UIButton :disabled="!isOnline" @click="userStore.signInWithRedirection()">{{
      $t({ en: 'Sign in', zh: '登录' })
    }}</UIButton>
  </div>
  <UIDropdown v-else placement="bottom-end">
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
        <UIMenuItem @click="userStore.signOut()">{{
          $t({ en: 'Sign out', zh: '登出' })
        }}</UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<script setup lang="ts">
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import { useNetwork } from '@/utils/network'
import { useUserStore } from '@/stores'

const userStore = useUserStore()
const { isOnline } = useNetwork()
</script>

<style lang="scss" scoped>
.sign-in,
.avatar {
  height: 100%;
  display: flex;
  align-items: center;
}

.avatar {
  margin-right: 8px;
  padding: 0 24px;

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
