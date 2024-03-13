<template>
  <div>
    <n-button v-if="!userStore.userInfo" :disabled="networkStore.offline()" @click="signin()">Sign in</n-button>
    <n-dropdown
      v-else
      trigger="hover"
      :options="avatarDropdownOptions"
      @select="handleAvatarDropdownClick"
    >
      <n-avatar round :src="userStore.userInfo.avatar" class="user-avatar" />
    </n-dropdown>
  </div>
</template>

<script setup lang="ts">
import { NAvatar, NButton, NDropdown } from 'naive-ui'
import { useUserStore } from '@/store/modules/user'
import { useNetworkStore } from "@/store/modules/network";

const avatarDropdownOptions = [
  { label: 'Settings', key: 'settings' },
  { label: 'Logout', key: 'logout' }
]

const userStore = useUserStore()
const networkStore = useNetworkStore()

function signin() {
  userStore.signInWithRedirection()
}

function handleAvatarDropdownClick(key: string) {
  if (key === 'logout') {
    userStore.signOut()
  }
}
</script>

<style scoped lang="scss">
.user-avatar {
  width: 38px;
  height: 38px;
}
</style>
