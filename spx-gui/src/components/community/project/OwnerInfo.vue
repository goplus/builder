<script setup lang="ts">
import { useUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import UserLink from '../user/UserLink.vue'

const props = defineProps<{
  owner: string
}>()

const { data: user } = useUser(() => props.owner)
const avatarUrl = useAvatarUrl(() => user.value?.avatar)
</script>

<template>
  <UserLink class="owner-info" :user="user?.username ?? null">
    <i class="avatar" :style="user != null ? { backgroundImage: `url(${avatarUrl})` } : null"></i>
    {{ user?.displayName }}
  </UserLink>
</template>

<style lang="scss" scoped>
.owner-info {
  display: flex;
  align-items: center;
  gap: 4px;

  color: var(--ui-color-title);
  // TODO: extract to `@/components/ui/`?
  text-decoration: underline;
  transition: 0.1s;

  &:hover {
    color: var(--ui-color-primary-main);
    .avatar {
      border-color: var(--ui-color-primary-400);
    }
  }
  &:active {
    color: var(--ui-color-primary-600);
    .avatar {
      border-color: var(--ui-color-primary-600);
    }
  }
}

.avatar {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--ui-color-grey-100);
  background-color: var(--ui-color-grey-100);
  background-position: center;
  background-size: contain;
  transition: 0.1s;
}
</style>
