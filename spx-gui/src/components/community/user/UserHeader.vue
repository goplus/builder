<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type User } from '@/apis/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { timeout } from '@/utils/utils'
import { initiateSignIn, useSignedInUser } from '@/stores/user'
import { UIButton, UIImg, useMessage, useModal } from '@/components/ui'
import CommunityCard from '@/components/community/CommunityCard.vue'
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
  <CommunityCard class="user-header">
    <div class="cover" :style="{ backgroundImage: `url(${coverImgUrl})` }"></div>
    <UIImg class="avatar" :src="avatarUrl" />
    <div class="content">
      <div class="info">
        <div class="title-row">
          <h2 class="name">{{ user.displayName }}</h2>
          <UserUsernameInline :username="user.username" />
          <UserJoinedAt class="joined-at" :time="user.createdAt" />
        </div>
        <TextView style="max-height: 66px" :text="user.description" />
      </div>
      <div class="op">
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
  </CommunityCard>
</template>

<style lang="scss" scoped>
.user-header {
  position: relative;
}

.cover {
  width: 100%;
  height: 21.74vh;
  max-height: 200px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.avatar {
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: 152px;
  height: 152px;
  border: 2px solid var(--ui-color-grey-100);
  border-radius: 50%;
  background-color: var(--ui-color-grey-100);
}

.content {
  padding: 20px 20px 20px 192px;
  display: flex;
  align-items: end;
  gap: 100px;
}

.info {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-gap-middle);
  }

  .name {
    font-size: 20px;
    line-height: 28px;
    color: var(--ui-color-title);
    margin: 0;
  }

  .description {
    font-size: 13px;
    line-height: 20px;
    color: var(--ui-color-text);
  }
}

.op {
  flex: 0 0 110px;
  display: flex;
  justify-content: flex-end;
}
</style>
