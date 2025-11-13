<template>
  <div v-if="!signedInUser" class="sign-in">
    <UIButton
      v-radar="{ name: 'Sign-in button', desc: 'Click to sign in' }"
      class="sign-in-button"
      type="secondary"
      :disabled="!isOnline"
      @click="initiateSignIn()"
      >{{ $t({ en: 'Sign in', zh: '登录' }) }}</UIButton
    >
  </div>
  <UIDropdown v-else placement="bottom-end" :offset="{ x: 0, y: 8 }">
    <template #trigger>
      <div class="avatar">
        <img class="avatar-img" :src="avatarUrl ?? undefined" />
      </div>
    </template>
    <UIMenu class="user-menu">
      <UIMenuGroup>
        <UIMenuItem :interactive="false">
          {{ signedInUser?.displayName }}
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
      <UIMenuGroup v-if="signedInUser?.capabilities.canManageAssets">
        <UIMenuItem @click="manageAssets(AssetType.Sprite)">
          {{ $t({ en: 'Manage sprites', zh: '管理精灵' }) }}
        </UIMenuItem>
        <UIMenuItem @click="manageAssets(AssetType.Sound)">
          {{ $t({ en: 'Manage sounds', zh: '管理声音' }) }}
        </UIMenuItem>
        <UIMenuItem @click="manageAssets(AssetType.Backdrop)">
          {{ $t({ en: 'Manage backdrops', zh: '管理背景' }) }}
        </UIMenuItem>
      </UIMenuGroup>
      <UIMenuGroup v-if="signedInUser?.capabilities.canManageCourses">
        <UIMenuItem @click="manageCourses()">
          {{ $t({ en: 'Manage courses', zh: '管理课程' }) }}
        </UIMenuItem>
        <UIMenuItem @click="manageCourseSeries()">
          {{ $t({ en: 'Manage course series', zh: '管理课程系列' }) }}
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
import { useRouter } from 'vue-router'
import { useNetwork } from '@/utils/network'
import { useMessageHandle } from '@/utils/exception'
import { getUserPageRoute } from '@/router'
import { AssetType } from '@/apis/asset'
import { initiateSignIn, signOut, useSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import { useAssetLibraryManagement } from '@/components/asset'
import { useCourseManagement, useCourseSeriesManagement } from '@/components/course'
import { isDeveloperMode } from '@/utils/developer-mode'
import { useAgentCopilotCtx } from '@/components/agent-copilot/CopilotProvider.vue'

const { isOnline } = useNetwork()
const router = useRouter()
const { controls } = useAgentCopilotCtx()

const { data: signedInUser } = useSignedInUser()
const avatarUrl = useAvatarUrl(() => signedInUser.value?.avatar)

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
  router.push(getUserPageRoute(signedInUser.value!.username))
}

function handleProjects() {
  router.push(getUserPageRoute(signedInUser.value!.username, 'projects'))
}

const manageAssetLibrary = useAssetLibraryManagement()
const manageAssets = useMessageHandle(manageAssetLibrary).fn

const manageCoursesFn = useCourseManagement()
const manageCourses = useMessageHandle(manageCoursesFn).fn

const manageCourseSeriesFn = useCourseSeriesManagement()
const manageCourseSeries = useMessageHandle(manageCourseSeriesFn).fn

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
  signOut()
  router.go(0) // Reload the page to trigger navigation guards.
}
</script>

<style lang="scss" scoped>
.sign-in,
.avatar {
  padding: 0 20px;
  margin-right: 8px;
  height: 100%;
  display: flex;
  align-items: center;
}

.sign-in-button {
  font: inherit;
}

.sign-in {
  white-space: nowrap;
}

.avatar {
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
