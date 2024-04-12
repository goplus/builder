<template>
  <UIButton v-if="!userStore.userInfo" :disabled="!isOnline" @click="userStore.signInWithRedirection()">{{
    $t({ en: 'Sign in', zh: '登录' })
  }}</UIButton>
  <UIDropdown v-else>
    <template #trigger>
      <img class="user-avatar" :src="userStore.userInfo.avatar" />
    </template>
    <UIMenu>
      <UIMenuItem @click="userStore.signOut()">{{ t({ en: 'Sign out', zh: '登出' }) }}</UIMenuItem>
    </UIMenu>
  </UIDropdown>
</template>

<script setup lang="ts">
import { useNetwork } from '@/utils/network'
import { useI18n } from '@/utils/i18n'
import { useUserStore } from '@/stores'
import { UIDropdown, UIMenu, UIMenuItem, UIButton } from '@/components/ui'

const { t } = useI18n()

const userStore = useUserStore()
const { isOnline } = useNetwork()
</script>

<style scoped lang="scss">
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 16px;
}
</style>
