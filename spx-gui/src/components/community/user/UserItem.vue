<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/apis/user'
import { getUserPageRoute } from '@/router'
import UserAvatar from './UserAvatar.vue'
import FollowButton from './FollowButton.vue'
import UserJoinedAt from './UserJoinedAt.vue'
import RouterUILink from '@/components/common/RouterUILink.vue'

const props = defineProps<{
  user: User
}>()

const userRoute = computed(() => getUserPageRoute(props.user.username))
</script>

<template>
  <li class="user-item">
    <UserAvatar :user="user" />
    <div class="user-info">
      <RouterUILink class="name" type="boring" :to="userRoute">{{ user.displayName }}</RouterUILink>
      <UserJoinedAt class="joined-at" :time="user.createdAt" />
      <p class="description">{{ user.description }}</p>
    </div>
    <div class="op">
      <FollowButton class="follow" :name="user.username" />
    </div>
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
  // TODO: should this style be one type of `UILink` / `RouterUILink`?
  text-decoration: none;
}

.description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-color-text);
}

.op {
  flex: 0 0 100px;
  display: flex;
  justify-content: flex-end;
}
</style>
