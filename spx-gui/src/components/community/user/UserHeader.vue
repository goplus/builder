<script setup lang="ts">
import { computed } from 'vue'
import { type User } from '@/apis/user'
import { useUserStore } from '@/stores'
import { UIButton, UIImg, useModal } from '@/components/ui'
import CommunityCard from '@/components/community/CommunityCard.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'
import EditProfileModal from './EditProfileModal.vue'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  user: User
}>()

const emit = defineEmits<{
  updated: [User]
}>()

const isCurrentUser = computed(() => props.user.username === useUserStore().userInfo?.name)

const invokeEditProfileModal = useModal(EditProfileModal)

const handleEditProfile = useMessageHandle(
  async () => {
    const updated = await invokeEditProfileModal({ user: props.user })
    emit('updated', updated)
  },
  { en: 'Failed to update profile', zh: '更新个人信息失败' }
).fn
</script>

<template>
  <CommunityCard class="user-header">
    <div class="cover"></div>
    <UIImg class="avatar" :src="user.avatar" />
    <div class="content">
      <div class="info">
        <h2 class="name">
          {{ user.displayName }}
          <UserJoinedAt class="joined-at" :time="user.createdAt" />
        </h2>
        <p class="description">{{ user.description || '&nbsp;' }}</p>
      </div>
      <div class="op">
        <FollowButton :name="user.username" />
        <UIButton v-if="isCurrentUser" @click="handleEditProfile">
          {{ $t({ en: 'Edit profile', zh: '编辑' }) }}
        </UIButton>
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
  // TODO: optimize me together with https://github.com/goplus/builder/issues/978
  aspect-ratio: 1280 / 200;
  background: center / cover no-repeat url(./cover.jpg);
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
  padding: 20px 24px 20px 192px;
  display: flex;
  align-items: end;
  gap: 100px;
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
}
</style>
