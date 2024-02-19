<template>
  <div>
    <n-dropdown
      v-if="tokenStore.hasLoggedIn()"
      trigger="hover"
      :options="avatarDropdownOptions"
      @select="handleAvatarDropdownClick"
    >
      <n-avatar round :src="profile?.avatar" class="user-avatar" />
    </n-dropdown>
    <n-button v-else @click="login()">Login</n-button>
  </div>
</template>

<script setup lang="ts">
import { NAvatar, NButton, NDropdown } from 'naive-ui'
import { useTokenStore } from '@/store/modules/user'
import { casdoorSdk } from '@/util/casdoor'
import { useProfile } from '@/util/use-profile'

const avatarDropdownOptions = [
  { label: 'Settings', key: 'settings' },
  { label: 'Logout', key: 'logout' }
]

const tokenStore = useTokenStore()

const { data: profile } = useProfile()

function login() {
  casdoorSdk.signinWithRedirection()
}

function handleAvatarDropdownClick(key: string) {
  if (key === 'logout') {
    tokenStore.logout()
  }
}
</script>

<style scoped lang="scss">
.user-avatar {
  width: 38px;
  height: 38px;
}
</style>
