<!--
 * @Author: xuning 453594138@qq.com
 * @Date: 2024-03-12 15:42:02
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-12 16:34:21
 * @FilePath: /builder/spx-gui/src/components/top-menu/UserAvatar.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div>
    <n-button v-if="!userStore.userInfo" :disabled="networkStore.offline()" @click="signin()">{{ $t('tab.signIn') }}</n-button>
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
