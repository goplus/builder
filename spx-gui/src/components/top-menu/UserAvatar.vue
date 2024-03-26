<template>
  <div>
    <n-button v-if="!userStore.userInfo" :disabled="!isOnline" @click="signin()">{{
      $t('tab.signIn')
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
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useNetwork } from '@/util/network'
import { useUserStore } from '@/store'

const { t } = useI18n({
  inheritLocale: true
})

const avatarDropdownOptions = computed(() => [
  {
    label: t('tab.logOut'),
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
