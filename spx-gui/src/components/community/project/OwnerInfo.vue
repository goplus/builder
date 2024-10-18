<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import { getUser } from '@/apis/user'
import UserLink from '../user/UserLink.vue'

const props = defineProps<{
  owner: string
}>()

const user = useAsyncComputed(() => getUser(props.owner))
</script>

<template>
  <UserLink class="owner-info" :user="user">
    <i class="avatar" :style="user != null ? { backgroundImage: `url(${user.avatar})` } : null"></i>
    {{ owner }}
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
