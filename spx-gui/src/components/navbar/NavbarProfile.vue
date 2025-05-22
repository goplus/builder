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
      <UIMenuGroup v-if="isDeveloperMode">
        <UIMenuItem v-if="spxVersion === 'v2'" @click="handleUseSpxV1">
          {{ $t({ en: 'Use SPX v1', zh: '使用 SPX v1' }) }}
        </UIMenuItem>
        <UIMenuItem v-if="spxVersion === 'v1'" @click="handleUseSpxV2">
          {{ $t({ en: 'Use SPX v2', zh: '使用 SPX v2' }) }}
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
      <UIMenuGroup v-if="isDeveloperMode">
        <UIMenuItem @click="handleUseMcpDebuggerUtils">
          {{ $t({ en: 'Use MCP Debugger Utils', zh: '启用 MCP 调试工具' }) }}
        </UIMenuItem>
        <UIMenuItem @click="handleAskCopilotAgent">
          {{ $t({ en: 'Ask Copilot Agent', zh: '向 Copilot Agent 提问' }) }}
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
import { useSpxVersion } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { getUserPageRoute } from '@/router'
import { AssetType } from '@/apis/asset'
import { useUserStore } from '@/stores/user'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import { useAssetLibraryManagement } from '@/components/asset'
import { useDeveloperMode } from '@/utils/developer-mode'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'

const userStore = useUserStore()
const { isOnline } = useNetwork()
const { isDeveloperMode } = useDeveloperMode()
const router = useRouter()
const { controls } = useCopilotCtx()

const userInfo = computed(() => userStore.getSignedInUser())

const handleAskCopilotAgent = useMessageHandle(
  async () => {
    const isVisible = controls.toggle()
    return isVisible
  },
  undefined,
  (isVisible) => ({
    en: isVisible ? 'Copilot Agent opened' : 'Copilot Agent closed',
    zh: isVisible ? 'Copilot Agent 已打开' : 'Copilot Agent 已关闭'
  })
).fn

function handleUserPage() {
  router.push(getUserPageRoute(userInfo.value!.name))
}

function handleProjects() {
  router.push(getUserPageRoute(userInfo.value!.name, 'projects'))
}

const spxVersion = useSpxVersion()

const handleUseSpxV1 = useMessageHandle(
  async () => {
    spxVersion.value = 'v1'
  },
  undefined,
  {
    en: 'Switched to SPX v1',
    zh: '已切换为 SPX v1'
  }
).fn

const handleUseSpxV2 = useMessageHandle(
  async () => {
    spxVersion.value = 'v2'
  },
  undefined,
  {
    en: 'Switched to SPX v2',
    zh: '已切换为 SPX v2'
  }
).fn

function handleDisableAdvancedLibrary() {
  userStore.disableAdvancedLibrary()
}

const manageAssetLibrary = useAssetLibraryManagement()
const manageAssets = useMessageHandle(manageAssetLibrary).fn
const handleUseMcpDebuggerUtils = useMessageHandle(
  async () => {
    const isVisible = controls.mcpDebugger.toggle()
    return isVisible
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
