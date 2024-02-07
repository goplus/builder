<template>
  <div>
    <n-dropdown
      v-if="userStore.loggedIn"
      trigger="hover"
      :options="avatarDropdownOptions"
      @select="handleAvatarDropdownClick"
    >
      <n-avatar round :src="userStore.avatarUrl" class="user-avatar" />
    </n-dropdown>
    <n-button v-else @click="showLoginModal = true">Login</n-button>
    <n-modal v-model:show="showLoginModal" title="Login" preset="card" style="width: 600px">
      <LoginModalContent />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NAvatar, NButton, NDropdown, useMessage, NModal } from 'naive-ui'
import LoginModalContent from './LoginModalContent.vue'
import { useUserStore } from '@/store/modules/user'

const avatarDropdownOptions = [{ label: 'Settings' }, { label: 'Logout', key: 'logout' }]
function handleAvatarDropdownClick(key: string) {
  if (key === 'logout') {
    logout()
  }
}

const showLoginModal = ref(false)

const message = useMessage()
const userStore = useUserStore()

function logout() {
  message.success('Logout successfully')
  userStore.loggedIn = false
}
</script>

<style scoped lang="scss">
.user-avatar {
  width: 38px;
  height: 38px;
}
</style>
