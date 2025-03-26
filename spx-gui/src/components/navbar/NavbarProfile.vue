<template>
  <div v-if="!userInfo" class="sign-in">
    <UIButton type="secondary" :disabled="!isOnline" @click="userStore.initiateSignIn()">{{
      $t({ en: 'Sign in', zh: '登录' })
    }}</UIButton>
  </div>
  <UIDropdown v-else placement="bottom-end" :offset="{ x: -4, y: 8 }">
    <template #trigger>
      <div class="avatar">
        <img class="avatar-img" :src="userInfo.avatar" />
      </div>
    </template>
    <UIMenu class="user-menu">
      <UIMenuGroup>
        <UIMenuItem :interactive="false">
          {{ userInfo.displayName || userInfo.name }}
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
        <UIMenuItem v-if="spxVersion === 'v2'" @click="handleUseSpxV1">
          {{ $t({ en: 'Use default SPX', zh: '使用默认 SPX' }) }}
        </UIMenuItem>
        <UIMenuItem v-if="spxVersion === 'v1'" @click="handleUseSpxV2">
          {{ $t({ en: 'Use new SPX (in beta)', zh: '启用新 SPX（测试中）' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup v-if="userInfo.advancedLibraryEnabled">
        <UIMenuItem @click="manageAssets(AssetType.Sprite)">
          {{ $t({ en: 'Manage sprites', zh: '管理精灵' }) }}
        </UIMenuItem>
        <UIMenuItem @click="manageAssets(AssetType.Sound)">
          {{ $t({ en: 'Manage sounds', zh: '管理声音' }) }}
        </UIMenuItem>
        <UIMenuItem @click="manageAssets(AssetType.Backdrop)">
          {{ $t({ en: 'Manage backdrops', zh: '管理背景' }) }}
        </UIMenuItem>
        <UIMenuItem @click="handleDisableAdvancedLibrary">
          {{ $t({ en: 'Disable advanced library features', zh: '禁用高级素材库功能' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup>
        <UIMenuItem @click="handleUseMcpDebuggerUtils">
          {{ $t({ en: 'Use MCP Debugger Utils', zh: '启用 MCP 调试工具' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup>
        <UIMenuItem @click="handleSignOut">{{ $t({ en: 'Sign out', zh: '登出' }) }}</UIMenuItem>
      </UIMenuGroup>
    </UIMenu>
  </UIDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNetwork } from '@/utils/network'
import { useSpxVersion, useMcpDebuggerStore } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { getUserPageRoute } from '@/router'
import { AssetType } from '@/apis/asset'
import { useUserStore } from '@/stores/user'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem, useConfirmDialog } from '@/components/ui'
import { useAssetLibraryManagement } from '@/components/asset'

const userStore = useUserStore()
const { isOnline } = useNetwork()
const router = useRouter()

const userInfo = computed(() => userStore.getSignedInUser())

function handleUserPage() {
  router.push(getUserPageRoute(userInfo.value!.name))
}

function handleProjects() {
  router.push(getUserPageRoute(userInfo.value!.name, 'projects'))
}

const spxVersion = useSpxVersion()

const mcpDebuggerVisible = useMcpDebuggerStore()

const handleUseSpxV1 = useMessageHandle(
  async () => {
    spxVersion.value = 'v1'
  },
  undefined,
  {
    en: 'Back to the default version of SPX',
    zh: '已切换回默认版本 SPX'
  }
).fn

const i18n = useI18n()
const withConfirm = useConfirmDialog()

const handleUseSpxV2 = useMessageHandle(
  async () => {
    await withConfirm({
      type: 'info',
      title: i18n.t({
        en: 'Use new version of SPX',
        zh: '启用新版本 SPX'
      }),
      content: i18n.t({
        en: 'The new version of SPX is still in beta. You can switch back to the default version anytime if you encounter issues.',
        zh: '新版本 SPX 还在测试中，如果遇到问题可以随时退回到默认版本。'
      })
    })
    spxVersion.value = 'v2'
  },
  undefined,
  {
    en: 'Now using the new version of SPX',
    zh: '已启用新版本 SPX'
  }
).fn

function handleDisableAdvancedLibrary() {
  userStore.disableAdvancedLibrary()
}

const manageAssetLibrary = useAssetLibraryManagement()
const manageAssets = useMessageHandle(manageAssetLibrary).fn
const handleUseMcpDebuggerUtils = useMessageHandle(
  async () => {
    mcpDebuggerVisible.value = !mcpDebuggerVisible.value // Toggle visibility
    return mcpDebuggerVisible.value
  },
  undefined,
  (isVisible) => ({
    en: `MCP Debugger Utils ${isVisible ? 'enabled' : 'disabled'}`,
    zh: `MCP 调试工具${isVisible ? '已启用' : '已禁用'}`
  })
).fn

function handleSignOut() {
  userStore.signOut()
  router.go(0) // Reload the page to trigger navigation guards.
}
</script>

<style lang="scss" scoped>
.sign-in,
.avatar {
  margin: 0 4px 0 0;
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
