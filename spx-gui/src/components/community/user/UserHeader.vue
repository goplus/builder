<script setup lang="ts">
import { computed } from 'vue'
import { type User } from '@/apis/user'
import { useExternalUrl } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { getSignedInUsername } from '@/stores/user'
import { UIButton, UIImg, useModal } from '@/components/ui'
import CommunityCard from '@/components/community/CommunityCard.vue'
import TextView from '../TextView.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'
import EditProfileModal from './EditProfileModal.vue'
import { getCoverImgUrl } from './cover'
import { useResponsive } from '@/components/ui/responsive'
const props = defineProps<{
  user: User
}>()
const isMobile = useResponsive('mobile')
const isSignedInUser = computed(() => props.user.username === getSignedInUsername())
const avatarUrl = useExternalUrl(() => props.user.avatar)
const coverImgUrl = computed(() => getCoverImgUrl(props.user.username))

const invokeEditProfileModal = useModal(EditProfileModal)

const handleEditProfile = useMessageHandle(async () => invokeEditProfileModal({ user: props.user }), {
  en: 'Failed to update profile',
  zh: '更新个人信息失败'
}).fn
</script>

<template>
  <CommunityCard class="user-header">
    <div class="cover" :style="{ backgroundImage: `url(${coverImgUrl})` }"></div>
    <UIImg class="avatar" :src="avatarUrl" />
    <div class="content">
      <div class="info">
        <h2 class="name">
          {{ user.displayName }}
          <UserJoinedAt class="joined-at" :time="user.createdAt" />
        </h2>
        <TextView v-if="!isMobile" style="max-height: 66px" :text="user.description" />
      </div>
      <div class="op">
        <UIButton
          v-if="isSignedInUser && !isMobile"
          v-radar="{ name: 'Edit profile button', desc: 'Click to edit user profile' }"
          @click="handleEditProfile"
        >
          {{ $t({ en: 'Edit profile', zh: '编辑' }) }}
        </UIButton>
        <FollowButton :name="user.username" />
      </div>
    </div>
  </CommunityCard>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive.scss';

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

  @include responsive(mobile) {
    height: 15vh;
    max-height: 120px;
  }
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

  @include responsive(mobile) {
    left: 16px;
    bottom: 16px;
    width: 80px;
    height: 80px;
  }
}

.content {
  padding: 20px 20px 20px 192px;
  display: flex;
  align-items: end;
  gap: 100px;

  @include responsive(mobile) {
    padding: 16px 16px 16px 112px;
    gap: 20px;
    justify-content: center;
    align-items: flex-start;
  }
}

.info {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .name {
    display: flex;
    align-items: end;
    gap: var(--ui-gap-middle);
    font-size: 20px;
    line-height: 28px;
    color: var(--ui-color-title);

    @include responsive(mobile) {
      font-size: 16px;
      line-height: 22px;
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
  }

  .joined-at {
    margin-bottom: 2px;
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

  @include responsive(mobile) {
    flex: 0 0 auto;
  }
}
</style>
