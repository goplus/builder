<script setup lang="ts">
import { type User } from '@/apis/user'
import { UIImg } from '@/components/ui'
import CommunityCard from '@/components/community/CommunityCard.vue'
import FollowButton from '../FollowButton.vue'
import UserJoinedAt from '../UserJoinedAt.vue'

defineProps<{
  user: User
}>()
</script>

<template>
  <CommunityCard class="user-header">
    <div class="cover"></div>
    <UIImg class="avatar" :src="user.avatar" />
    <div class="info">
      <h2 class="name">
        {{ user.displayName }}
        <UserJoinedAt class="joined-at" :time="user.cTime" />
      </h2>
      <p class="description">{{ user.description }}</p>
    </div>
    <FollowButton class="follow" :name="user.username" />
  </CommunityCard>
</template>

<style lang="scss" scoped>
.user-header {
  position: relative;
  padding: 220px 24px 20px 192px;
  display: flex;
  align-items: end;
  gap: 100px;
}

.cover {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: center / cover no-repeat url(./bg.jpg);
}

.avatar {
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: 152px;
  height: 152px;
  border-radius: 50%;
  background-color: var(--ui-color-grey-100);
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

.follow {
  flex: 0 0 auto;
}
</style>
