<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/apis/user'
import { getUserPageRoute } from '@/router'
import RouterUILink from '@/components/common/RouterUILink.vue'
import TextView from '../TextView.vue'
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
    <UserAvatar class="avatar" :user="user.username" />
    <RouterUILink class="name" type="boring" :to="userRoute">{{ user.displayName }}</RouterUILink>
    <UserJoinedAt class="joined-at" :time="user.createdAt" />
    <TextView v-if="!!user.description" class="description" :text="user.description" />
    <FollowButton class="follow" :name="user.username" />
  </li>
</template>

<style lang="scss" scoped>
.user-item {
  position: relative;
  padding: 12px 0 12px 56px;
  display: flex;
  flex-direction: column;
}

.avatar {
  position: absolute;
  left: 0;
  top: 12px;
}

.name,
.joined-at,
.description {
  width: fit-content;
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
  max-height: 60px;
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-color-text);
}

.follow {
  position: absolute;
  top: 12px;
  right: 0;
}
</style>
