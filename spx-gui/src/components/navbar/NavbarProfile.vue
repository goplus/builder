<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="!loading && signedInUser == null" class="mr-2 flex h-full items-center px-5 whitespace-nowrap">
    <UIButton
      v-radar="{ name: 'Sign-in button', desc: 'Click to sign in' }"
      color="secondary"
      :disabled="!isOnline"
      @click="initiateSignIn()"
      >{{ $t({ en: 'Sign in', zh: '登录' }) }}</UIButton
    >
  </div>
  <UIDropdown v-else placement="bottom-end" :offset="{ x: 0, y: 8 }">
    <template #trigger>
      <div class="mr-2 flex h-full items-center justify-center px-5">
        <img class="h-8 w-8 rounded-full border-2 border-grey-100" :src="avatarUrl ?? undefined" />
      </div>
    </template>
    <UIMenu class="min-w-30">
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
              class="justify-between p-2"
              @click="toggleLang"
            >
              {{ $t({ en: 'Language', zh: '语言' }) }}
              <div class="lang-switch-icon h-4.5 w-4.5 text-turquoise-600" v-html="langContent"></div>
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

<style scoped>
.lang-switch-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
