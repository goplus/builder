<template>
  <RouterLink
    v-if="user != null"
    :to="to"
    class="user-avatar"
    :style="{ backgroundImage: `url(${user.avatar})` }"
    :title="user.displayName"
  ></RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { getUser, type User } from '@/apis/user'
import { getUserPageRoute } from '@/router'

const props = defineProps<{
  owner: string | User
}>()

const username = computed(() =>
  typeof props.owner === 'string' ? props.owner : props.owner.username
)
const to = computed(() => getUserPageRoute(username.value))
const user = useAsyncComputed(() =>
  typeof props.owner === 'string' ? getUser(props.owner) : Promise.resolve(props.owner)
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

  &:hover {
    border-color: var(--ui-color-primary-400);
  }
  &:active {
    border-color: var(--ui-color-primary-600);
  }
}
</style>
