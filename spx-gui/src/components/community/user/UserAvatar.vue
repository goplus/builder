<template>
  <UserLink
    class="user-avatar"
    :class="`size-${size}`"
    :style="userInfo != null ? { backgroundImage: `url(${userInfo.avatar})` } : null"
    :user="userInfo"
  ></UserLink>
</template>

<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import { getUser, type User } from '@/apis/user'
import UserLink from './UserLink.vue'

export type Size = 'small' | 'medium'

const props = withDefaults(
  defineProps<{
    user: string | User
    size?: Size
  }>(),
  {
    size: 'medium'
  }
)

const userInfo = useAsyncComputed(() =>
  typeof props.user === 'string' ? getUser(props.user) : Promise.resolve(props.user)
)
</script>

<style lang="scss" scoped>
.user-avatar {
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--ui-color-grey-100);
  background-color: var(--ui-color-grey-100);
  background-position: center;
  background-size: contain;
  transition: 0.1s;

  &.size-small {
    width: 30px;
    height: 30px;
    border-width: 2px;
  }

  &:hover {
    border-color: var(--ui-color-primary-400);
  }
  &:active {
    border-color: var(--ui-color-primary-600);
  }
}
</style>
