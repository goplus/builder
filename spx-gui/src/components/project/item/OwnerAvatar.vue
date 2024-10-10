<template>
  <RouterLink
    v-if="user != null"
    :to="to"
    class="project-owner-avatar"
    :style="{ backgroundImage: `url(${user.avatar})` }"
    :title="user.displayName"
  ></RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAsyncComputed } from '@/utils/utils'
import { getUser } from '@/apis/user'
import { getUserPageRoute } from '@/router'

const props = defineProps<{
  owner: string
}>()

const to = computed(() => getUserPageRoute(props.owner))
const user = useAsyncComputed(() => getUser(props.owner))
</script>

<style lang="scss" scoped>
.project-owner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--ui-color-grey-100);
  background-color: var(--ui-color-grey-100);
  background-position: center;
  background-size: contain;
  transition: 0.3s;

  &:hover {
    border-color: var(--ui-color-primary-400);
  }
  &:active {
    border-color: var(--ui-color-primary-600);
  }
}
</style>
