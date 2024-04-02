<template>
  <div>
    <n-button v-if="!userStore.userInfo" :disabled="!isOnline" @click="signin()">{{
      _t({ en: 'Sign in', zh: '登录' })
    }}</n-button>
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
import { computed } from 'vue'
import { useNetwork } from '@/utils/network'
import { useI18n } from '@/utils/i18n'
import { useUserStore } from '@/stores'

const { t } = useI18n()

const avatarDropdownOptions = computed(() => [
  {
    label: t({ en: 'Sign out', zh: '登出' }),
    key: 'logout'
  }
])

const userStore = useUserStore()
const { isOnline } = useNetwork()

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
