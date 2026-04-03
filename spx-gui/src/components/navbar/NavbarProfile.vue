<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="!loading && signedInUser == null" class="sign-in">
    <UIButton
      v-radar="{ name: 'Sign-in button', desc: 'Click to sign in' }"
      class="sign-in-button"
      color="secondary"
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
          <div class="user-info-wrapper">
            {{ signedInUser?.displayName }}
          </div>
        </UIMenuItem>
        <UITooltip placement="left">
          <template #trigger>
            <UIMenuItem
              v-radar="{ name: 'Language switcher', desc: 'Click to switch between English and Chinese' }"
              class="lang-item"
              @click="toggleLang"
            >
              {{ $t({ en: 'Language', zh: '语言' }) }}
              <div class="icon" v-html="langContent"></div>
            </UIMenuItem>
          </template>
          {{ $t({ en: 'English / 中文', zh: '中文 / English' }) }}
        </UITooltip>
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
import { useMessageHandle } from '@/utils/exception'
import { getUserPageRoute } from '@/router'
import { AssetType } from '@/apis/asset'
import { initiateSignIn, signOut, useSignedInStateQuery } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import { UIButton, UIDropdown, UIMenu, UIMenuGroup, UIMenuItem, UITooltip } from '@/components/ui'
import { useAssetLibraryManagement } from '@/components/asset'
import { useCourseManagement, useCourseSeriesManagement } from '@/components/course'
import { useI18n } from '@/utils/i18n'
import enSvg from './icons/en.svg?raw'
import zhSvg from './icons/zh.svg?raw'

const { isOnline } = useNetwork()
const router = useRouter()
const i18n = useI18n()

const signedInStateQuery = useSignedInStateQuery()
const loading = computed(() => signedInStateQuery.isLoading.value)
const signedInUser = computed(() => signedInStateQuery.data.value?.user ?? null)
const avatarUrl = useAvatarUrl(() => signedInUser.value?.avatar)

const langContent = computed(() => (i18n.lang.value === 'en' ? enSvg : zhSvg))
function toggleLang() {
  i18n.setLang(i18n.lang.value === 'en' ? 'zh' : 'en')
}

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

.lang-item {
  padding: 8px;
  justify-content: space-between;

  .icon {
    width: 18px;
    height: 18px;
    color: var(--ui-color-turquoise-600);

    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }
}

.user-menu {
  min-width: 120px;
}
</style>
