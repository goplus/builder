<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type User } from '@/apis/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { timeout } from '@/utils/utils'
import { initiateSignIn, useSignedInUser } from '@/stores/user'
import { UIButton, UICard, UIImg, useMessage, useModal } from '@/components/ui'
import TextView from '../TextView.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'
import EditProfileModal from './EditProfileModal.vue'
import UserUsernameInline from './UserUsernameInline.vue'
import { getCoverImgUrl } from './cover'

const props = defineProps<{
  user: User
}>()

const router = useRouter()
const route = useRoute()
const signedInUser = useSignedInUser()
const isSignedInUser = computed(() => props.user.username === signedInUser.value?.username)
const avatarUrl = useAvatarUrl(() => props.user.avatar)
const coverImgUrl = computed(() => getCoverImgUrl(props.user.username))

const invokeEditProfileModal = useModal(EditProfileModal)

const i18n = useI18n()
const message = useMessage()

const handleUsernameUpdated = useMessageHandle(
  async (newUsername: string) => {
    await router.replace({
      params: {
        nameInput: newUsername
      },
      query: route.query,
      hash: route.hash
    })
    message.success(
      i18n.t({
        en: 'Username updated successfully. Redirecting to the sign-in page...',
        zh: '用户名更新成功。正在重定向到登录页面...'
      })
    )
    await timeout(2000)
    initiateSignIn()
  },
  {
    en: 'Failed to redirect after username update',
    zh: '用户名更新后重定向失败'
  }
).fn

const handleEditProfile = useMessageHandle(
  async () => {
    const oldUsername = props.user.username
    const updated = await invokeEditProfileModal({ user: props.user })
    if (oldUsername !== updated.username) return handleUsernameUpdated(updated.username)
  },
  {
    en: 'Failed to update profile',
    zh: '更新个人信息失败'
  }
).fn
</script>

<template>
  <UICard class="relative">
    <div
      class="h-[21.74vh] max-h-50 w-full bg-center bg-cover bg-no-repeat"
      :style="{ backgroundImage: `url(${coverImgUrl})` }"
    ></div>
    <div class="absolute bottom-5 left-5 h-38 w-38">
      <UIImg class="h-full w-full rounded-full border-2 border-grey-100 bg-grey-100" :src="avatarUrl" />
    </div>
    <div class="flex items-end gap-25 px-5 pt-5 pb-5 pl-48">
      <div class="flex-[1_1_0] flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-xl">
          <h2 class="m-0 text-2xl text-title">{{ user.displayName }}</h2>
          <UserUsernameInline :username="user.username" />
          <UserJoinedAt class="joined-at" :time="user.createdAt" />
        </div>
        <TextView style="max-height: 66px" :text="user.description" />
      </div>
      <div class="flex-[0_0_110px] flex justify-end">
        <UIButton
          v-if="isSignedInUser"
          v-radar="{ name: 'Edit profile button', desc: 'Click to edit user profile' }"
          @click="handleEditProfile"
        >
          {{ $t({ en: 'Edit profile', zh: '编辑' }) }}
        </UIButton>
        <FollowButton v-else :name="user.username" />
      </div>
    </div>
  </UICard>
</template>
