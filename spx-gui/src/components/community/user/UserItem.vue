<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/apis/user'
import { getUserPageRoute } from '@/router'
import UserAvatar from './UserAvatar.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'

const props = defineProps<{
  user: User
}>()

const userRoute = computed(() => getUserPageRoute(props.user.username))
</script>

<template>
  <li class="user-item">
    <UserAvatar :owner="user" />
    <div class="user-info">
      <RouterLink class="name" :to="userRoute">{{ user.displayName }}</RouterLink>
      <UserJoinedAt class="joined-at" :time="user.cTime" />
      <p class="description">{{ user.description }}</p>
    </div>
    <FollowButton class="follow" :name="user.username" />
  </li>
</template>

<style lang="scss" scoped>
.user-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 0;
}

.user-info {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.name {
  font-size: 15px;
  line-height: 24px;
  color: var(--ui-color-title);
  text-decoration: none;
  transition: 0.1s;

  &:hover {
    color: var(--ui-color-primary-main);
  }
}

.description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-color-text);
}

.follow {
  flex: 0 0 auto;
}
</style>
