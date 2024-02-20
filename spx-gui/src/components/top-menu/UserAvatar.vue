<template>
  <div>
    <n-button v-if="profile === null" @click="login()">Login</n-button>
    <n-dropdown
      v-else
      trigger="hover"
      :options="avatarDropdownOptions"
      @select="handleAvatarDropdownClick"
    >
      <n-avatar round :src="profile?.avatar" class="user-avatar" />
    </n-dropdown>
  </div>
</template>

<script setup lang="ts">
import { NAvatar, NButton, NDropdown } from 'naive-ui'
import { useUserStore } from '@/store/modules/user'
import { useProfile } from '@/util/use-profile'

const avatarDropdownOptions = [
  { label: 'Settings', key: 'settings' },
  { label: 'Logout', key: 'logout' }
]

const userStore = useUserStore()

const { data: profile } = useProfile()

function login() {
  userStore.loginWithCurrentUrl()
}

function handleAvatarDropdownClick(key: string) {
  if (key === 'logout') {
    userStore.logout()
  }
}
</script>

<style scoped lang="scss">
.user-avatar {
  width: 38px;
  height: 38px;
}
</style>
